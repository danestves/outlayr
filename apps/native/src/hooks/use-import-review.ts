import { DrizzleQueryError, and, eq, gte, isNull, lte } from "drizzle-orm";
import { useEffect } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useLiveQuery } from "@/data/live-query";
import { buildImportPlan, CsvTransferError } from "@/data/transfer-core";
import type { ImportEntry, ImportPlan, SkipReason } from "@/data/transfer-core";
import { categories, transactions } from "@/db/schema";
import { fingerprintsOf, flagDuplicates } from "@/domain/import-dedup";
import type { ImportCommitState, ImportFlowState } from "@/domain/import-flow";
import { importOutTotals } from "@/domain/import-totals";
import { deduceDateFormat, detectDecimalSeparator } from "@/domain/transaction-csv";
import { FALLBACK_IDENTITY_COLOR } from "@/domain/transaction-identity";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";
import { useHaptics } from "@/lib/use-haptics";
import { applyImportCommand } from "@/state/accounts-commands";
import { SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { attachImportLogosCommand, runMediaCommand } from "@/state/media-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export type ReviewRow =
    | {
          kind: "entry";
          key: string;
          index: number;
          entry: ImportEntry;
          duplicate: boolean;
      }
    | { kind: "header"; key: "skipped-header"; count: number }
    | { kind: "skipped"; key: string; row: number; reason: SkipReason };

export function buildReviewRows(plan: ImportPlan, duplicates: ReadonlySet<number>): ReviewRow[] {
    const rows: ReviewRow[] = plan.entries.map((entry, index) => ({
        duplicate: duplicates.has(index),
        entry,
        index,
        key: `entry-${index}`,
        kind: "entry",
    }));
    if (plan.skipped.length > 0) {
        rows.push({
            count: plan.skipped.length,
            key: "skipped-header",
            kind: "header",
        });
        for (const skipped of plan.skipped) {
            rows.push({
                key: `skipped-${skipped.row}`,
                kind: "skipped",
                reason: skipped.reason,
                row: skipped.row,
            });
        }
    }
    return rows;
}

function sameMembers(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
    return a.size === b.size && [...a].every((value) => b.has(value));
}

const EMPTY_PLAN: ImportPlan = {
    earliest: null,
    entries: [],
    latest: null,
    skipped: [],
};

function buildPlan(
    parsed: ImportFlowState["parsed"],
    resolved: ImportFlowState["resolved"],
    resolution: ImportFlowState["resolution"],
    categoryIncome: ReadonlyMap<string, boolean>
): ImportPlan {
    if (parsed == null || resolved == null) {
        return EMPTY_PLAN;
    }
    const { mapping } = resolved;
    const { rows } = parsed;
    const dateFormat = deduceDateFormat(rows.map((row) => row[mapping.date] ?? "")) ?? "";
    const decimal = detectDecimalSeparator(rows.map((row) => row[mapping.amount] ?? ""));
    return buildImportPlan(rows, mapping, dateFormat, decimal, resolution?.links ?? new Map(), categoryIncome);
}

export interface ReviewCategoryTile {
    color: string;
    emoji: string | null;
    icon: string | null;
}

export interface ImportReviewResult {
    categoryName: ReadonlyMap<string, string>;
    categoryTile: ReadonlyMap<string, ReviewCategoryTile>;
    commit: ImportCommitState;
    /** The ledger's display currency, for entries whose row stated none. */
    currency: string;
    excluded: ReadonlySet<number>;
    onCommit: () => void;
    onToggle: (index: number) => void;
    plan: ImportPlan;
    rows: ReviewRow[];
    selectedCount: number;
}

function indexCategories(
    rows: readonly {
        color: string | null;
        emoji: string | null;
        icon: string | null;
        id: string;
        income: boolean;
        name: string | null;
    }[]
) {
    const categoryIncome = new Map<string, boolean>();
    const categoryName = new Map<string, string>();
    const categoryTile = new Map<string, ReviewCategoryTile>();
    for (const row of rows) {
        categoryIncome.set(row.id, row.income);
        if (row.name != null) {
            categoryName.set(row.id, row.name);
        }
        categoryTile.set(row.id, {
            color: row.color ?? FALLBACK_IDENTITY_COLOR,
            emoji: row.emoji ?? null,
            icon: row.icon ?? null,
        });
    }
    return { categoryIncome, categoryName, categoryTile };
}

function onToggle(index: number) {
    importDraftStore.dispatch({ index, type: "rowToggled" });
}

export function useImportReview(): ImportReviewResult {
    const haptics = useHaptics();
    const db = useDatabase();
    const applyImport = useAtomCommand(applyImportCommand, SILENT);
    const { flow } = useImportDraft();
    const { parsed, resolved, resolution } = flow;

    const currency = useGlobalCurrency(db);

    const categoryRows = useLiveQuery(categories, () =>
        db
            .select({
                color: categories.color,
                emoji: categories.emoji,
                icon: categories.icon,
                id: categories.id,
                income: categories.income,
                name: categories.name,
            })
            .from(categories)
            .where(isNull(categories.deletedAt))
    );
    const { categoryIncome, categoryName, categoryTile } = indexCategories(categoryRows);

    const plan = buildPlan(parsed, resolved, resolution, categoryIncome);

    const existingRows = useLiveQuery(
        transactions,
        () =>
            db
                .select({
                    amount: transactions.amount,
                    date: transactions.date,
                    income: transactions.income,
                    note: transactions.note,
                })
                .from(transactions)
                .where(
                    plan.earliest == null || plan.latest == null
                        ? eq(transactions.id, "")
                        : and(
                              isNull(transactions.deletedAt),
                              gte(transactions.date, plan.earliest),
                              lte(transactions.date, plan.latest)
                          )
                ),
        [plan.earliest, plan.latest]
    );

    const duplicates = flagDuplicates(plan.entries, fingerprintsOf(existingRows));

    const settled = flow.commit.phase === "writing" || flow.commit.phase === "success";
    // oxlint-disable-next-line outlayr/react-effect-budget -- writes the ledger-derived duplicate set into the module-level import draft store that the sheet's other steps read
    useEffect(() => {
        // After the write, every committed row exists on the ledger and would
        // re-flag as its own duplicate; the flagged set is frozen from here.
        if (settled || sameMembers(duplicates, flow.duplicates)) {
            return;
        }
        importDraftStore.dispatch({
            indices: duplicates,
            type: "duplicatesFlagged",
        });
    }, [duplicates, flow.duplicates, settled]);

    const rows = buildReviewRows(plan, flow.duplicates);

    const selectedCount = plan.entries.filter((_, index) => !flow.excluded.has(index)).length;

    const onCommit = () => {
        if (importDraftStore.getSnapshot().flow.commit.phase === "writing") {
            return;
        }
        importDraftStore.dispatch({ type: "commitStarted" });
        const entries = plan.entries.filter((_, index) => !flow.excluded.has(index));
        const outTotals = importOutTotals(entries, currency);
        const duplicatesSkipped = [...flow.duplicates].filter((index) => flow.excluded.has(index)).length;
        void (async () => {
            try {
                const decorated = await runMediaCommand(attachImportLogosCommand, entries).catch(() => entries);
                const count = unwrapAtomCommand(await applyImport({ db, plan: { ...plan, entries: decorated } }));
                haptics("success");
                // The draft is NOT cleared here: the done step still reads the
                // committed counts. Dismissing the sheet after a success clears.
                importDraftStore.dispatch({
                    count,
                    duplicatesSkipped,
                    outTotals,
                    type: "commitSucceeded",
                });
                importDraftStore.setStep("done");
            } catch (cause: unknown) {
                const failure = cause instanceof CsvTransferError ? cause.cause : cause;
                importDraftStore.dispatch({
                    detail: failure instanceof Error ? failureDetail(failure) : null,
                    type: "commitFailed",
                });
            }
        })();
    };

    return {
        categoryName,
        categoryTile,
        commit: flow.commit,
        currency,
        excluded: flow.excluded,
        onCommit,
        onToggle,
        plan,
        rows,
        selectedCount,
    };
}

function failureDetail(error: Error): string {
    for (let current: unknown = error; current instanceof Error; current = current.cause) {
        if (current instanceof DrizzleQueryError && current.cause instanceof Error) {
            return current.cause.message;
        }
    }
    return error.message;
}
