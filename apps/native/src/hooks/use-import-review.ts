import { DrizzleQueryError, and, eq, gte, isNull, lte } from "drizzle-orm";
import * as Cause from "effect/Cause";
import { useEffect } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { presetForName } from "@/data/categories-core";
import { useLiveQuery } from "@/data/live-query";
import { applyCategoryOverrides, buildImportPlan, CsvTransferError } from "@/data/transfer-core";
import type { CategoryOverride, ImportEntry, ImportPlan, PlannedCategory, SkipReason } from "@/data/transfer-core";
import { categories, transactions } from "@/db/schema";
import { fingerprintsOf, flagDuplicates } from "@/domain/import-dedup";
import type { ImportCommitState, ImportFlowState } from "@/domain/import-flow";
import { importOutTotals } from "@/domain/import-totals";
import { deduceDateFormat, detectDecimalSeparator } from "@/domain/transaction-csv";
import { FALLBACK_IDENTITY_COLOR } from "@/domain/transaction-identity";
import { useProConfirmed, useProLocked } from "@/hooks/use-pro-locked";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { importWithLogosCommand } from "@/state/ledger-commands";
import { useAtomAction } from "@/state/use-atom-action";

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
        duplicate: duplicates.has(entry.row),
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
    newCategories: [],
    skipped: [],
};

function buildPlan(
    parsed: ImportFlowState["parsed"],
    resolved: ImportFlowState["resolved"],
    resolution: ImportFlowState["resolution"],
    categoryIncome: ReadonlyMap<string, boolean>,
    createMissingCategories: boolean
): ImportPlan {
    if (parsed == null || resolved == null) {
        return EMPTY_PLAN;
    }
    const { mapping } = resolved;
    const { rows } = parsed;
    const dateFormat = deduceDateFormat(rows.map((row) => row[mapping.date] ?? "")) ?? "";
    const decimal = detectDecimalSeparator(rows.map((row) => row[mapping.amount] ?? ""));
    return buildImportPlan(
        rows,
        mapping,
        dateFormat,
        decimal,
        resolution?.links ?? new Map(),
        categoryIncome,
        createMissingCategories
    );
}

export interface ReviewCategoryTile {
    color: string;
    emoji: string | null;
    icon: string | null;
}

export interface ReviewCategoryOption {
    id: string;
    income: boolean;
    name: string;
    tile: ReviewCategoryTile;
}

export interface ReviewNewCategory {
    category: PlannedCategory;
    count: number;
    override: CategoryOverride | undefined;
}

export interface ImportReviewResult {
    categoryName: ReadonlyMap<string, string>;
    categoryOptions: readonly ReviewCategoryOption[];
    categoryTile: ReadonlyMap<string, ReviewCategoryTile>;
    commit: ImportCommitState;
    /** The ledger's display currency, for entries whose row stated none. */
    currency: string;
    excluded: ReadonlySet<number>;
    newCategories: readonly ReviewNewCategory[];
    onCommit: () => void;
    onOverride: (plannedId: string, override: CategoryOverride | null) => void;
    onToggle: (row: number) => void;
    plan: ImportPlan;
    proCategoryCount: number;
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
    const categoryOptions: ReviewCategoryOption[] = [];
    const categoryTile = new Map<string, ReviewCategoryTile>();
    for (const row of rows) {
        categoryIncome.set(row.id, row.income);
        const tile = {
            color: row.color ?? FALLBACK_IDENTITY_COLOR,
            emoji: row.emoji ?? null,
            icon: row.icon ?? null,
        };
        categoryTile.set(row.id, tile);
        if (row.name != null) {
            categoryName.set(row.id, row.name);
            categoryOptions.push({ id: row.id, income: row.income, name: row.name, tile });
        }
    }
    return { categoryIncome, categoryName, categoryOptions, categoryTile };
}

function onToggle(row: number) {
    importDraftStore.dispatch({ row, type: "rowToggled" });
}

function onOverride(plannedId: string, override: CategoryOverride | null) {
    importDraftStore.dispatch({ override, plannedId, type: "categoryOverridden" });
}

function countNewCategories(
    built: ImportPlan,
    plan: ImportPlan,
    excluded: ReadonlySet<number>,
    overrides: ReadonlyMap<string, CategoryOverride>
): ReviewNewCategory[] {
    const selectedRows = new Set(plan.entries.filter((entry) => !excluded.has(entry.row)).map((entry) => entry.row));
    const counts = new Map<string, number>();
    for (const entry of built.entries) {
        if (overrides.get(entry.categoryId)?.kind === "skip" || selectedRows.has(entry.row)) {
            counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
        }
    }
    return built.newCategories
        .map((category) => ({
            category,
            count: counts.get(category.id) ?? 0,
            override: overrides.get(category.id),
        }))
        .filter((row) => row.count > 0);
}

export function useImportReview(): ImportReviewResult {
    const haptics = useHaptics();
    const db = useDatabase();
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
    const { categoryIncome, categoryName, categoryOptions, categoryTile } = indexCategories(categoryRows);

    const proLocked = useProLocked();
    const createsCategories = useProConfirmed();
    const built = buildPlan(parsed, resolved, resolution, categoryIncome, createsCategories);
    const plan = applyCategoryOverrides(built, flow.categoryOverrides);
    const proCategoryCount = proLocked
        ? buildPlan(parsed, resolved, resolution, categoryIncome, true).newCategories.length
        : 0;
    for (const category of built.newCategories) {
        const style = presetForName(category.name);
        categoryName.set(category.id, category.name);
        categoryTile.set(category.id, { color: style.color, emoji: null, icon: style.icon });
    }

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
            rows: duplicates,
            type: "duplicatesFlagged",
        });
    }, [duplicates, flow.duplicates, settled]);

    const rows = buildReviewRows(plan, flow.duplicates);

    const selectedEntries = plan.entries.filter((entry) => !flow.excluded.has(entry.row));

    const importRows = useAtomAction(
        importWithLogosCommand,
        {
            onFailure: (cause) => {
                const error = Cause.squash(cause);
                const failure = error instanceof CsvTransferError ? error.cause : error;
                importDraftStore.dispatch({
                    detail: failure instanceof Error ? failureDetail(failure) : null,
                    type: "commitFailed",
                });
            },
            onSuccess: (count) => {
                haptics("success");
                // The draft is NOT cleared here: the done step still reads the
                // committed counts. Dismissing the sheet after a success clears.
                importDraftStore.dispatch({
                    count,
                    duplicatesSkipped: [...flow.duplicates].filter((row) => flow.excluded.has(row)).length,
                    outTotals: importOutTotals(selectedEntries, currency),
                    type: "commitSucceeded",
                });
                importDraftStore.setStep("done");
            },
        },
        SILENT
    );

    const onCommit = () => {
        if (importDraftStore.getSnapshot().flow.commit.phase === "writing") {
            return;
        }
        importDraftStore.dispatch({ type: "commitStarted" });
        importRows({ db, plan: { ...plan, entries: selectedEntries } });
    };

    return {
        categoryName,
        categoryOptions,
        categoryTile,
        commit: flow.commit,
        currency,
        excluded: flow.excluded,
        newCategories: countNewCategories(built, plan, flow.excluded, flow.categoryOverrides),
        onCommit,
        onOverride,
        onToggle,
        plan,
        proCategoryCount,
        rows,
        selectedCount: selectedEntries.length,
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
