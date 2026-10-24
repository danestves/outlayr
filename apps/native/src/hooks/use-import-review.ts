import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { useCallback, useEffect, useMemo } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useLiveQuery } from "@/data/live-query";
import { applyImport, buildImportPlan } from "@/data/transfer-core";
import type { ImportEntry, ImportPlan, SkipReason } from "@/data/transfer-core";
import { categories, transactions } from "@/db/schema";
import { fingerprintsOf, flagDuplicates } from "@/domain/import-dedup";
import type { ImportCommitState } from "@/domain/import-flow";
import { deduceDateFormat, detectDecimalSeparator } from "@/domain/transaction-csv";
import { FALLBACK_IDENTITY_COLOR } from "@/domain/transaction-identity";
import { importDraftStore, useImportDraft } from "@/lib/import-draft-store";
import { attachImportLogos } from "@/lib/import-logo-attach";
import { useHaptics } from "@/lib/use-haptics";

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

export function useImportReview(): ImportReviewResult {
    const haptics = useHaptics();
    const db = useDatabase();
    const { flow } = useImportDraft();

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
    const { categoryIncome, categoryName, categoryTile } = useMemo(() => {
        const income = new Map<string, boolean>();
        const name = new Map<string, string>();
        const tile = new Map<string, ReviewCategoryTile>();
        for (const row of categoryRows) {
            income.set(row.id, row.income);
            if (row.name != null) {
                name.set(row.id, row.name);
            }
            tile.set(row.id, {
                color: row.color ?? FALLBACK_IDENTITY_COLOR,
                emoji: row.emoji ?? null,
                icon: row.icon ?? null,
            });
        }
        return { categoryIncome: income, categoryName: name, categoryTile: tile };
    }, [categoryRows]);

    const plan = useMemo(() => {
        if (flow.parsed == null || flow.resolved == null) {
            return EMPTY_PLAN;
        }
        const { mapping } = flow.resolved;
        const { rows } = flow.parsed;
        const dateFormat = deduceDateFormat(rows.map((row) => row[mapping.date] ?? "")) ?? "";
        const decimal = detectDecimalSeparator(rows.map((row) => row[mapping.amount] ?? ""));
        return buildImportPlan(rows, mapping, dateFormat, decimal, flow.resolution?.links ?? new Map(), categoryIncome);
    }, [flow.parsed, flow.resolved, flow.resolution, categoryIncome]);

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

    const duplicates = useMemo(
        () => flagDuplicates(plan.entries, fingerprintsOf(existingRows)),
        [plan.entries, existingRows]
    );

    const settled = flow.commit.phase === "writing" || flow.commit.phase === "success";
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

    const rows = useMemo(() => buildReviewRows(plan, flow.duplicates), [plan, flow.duplicates]);

    const selectedCount = plan.entries.filter((_, index) => !flow.excluded.has(index)).length;

    const onToggle = useCallback((index: number) => {
        importDraftStore.dispatch({ index, type: "rowToggled" });
    }, []);

    const onCommit = useCallback(() => {
        if (importDraftStore.getSnapshot().flow.commit.phase === "writing") {
            return;
        }
        importDraftStore.dispatch({ type: "commitStarted" });
        const entries = plan.entries.filter((_, index) => !flow.excluded.has(index));
        const outAmount = entries.reduce((sum, entry) => (entry.income ? sum : sum + entry.amount), 0);
        const duplicatesSkipped = [...flow.duplicates].filter((index) => flow.excluded.has(index)).length;
        attachImportLogos(entries)
            .catch(() => entries)
            .then((decorated) => applyImport(db, { ...plan, entries: decorated }))
            .then((count) => {
                haptics("success");
                // The draft is NOT cleared here: the done step still reads the
                // committed counts. Dismissing the sheet after a success clears.
                importDraftStore.dispatch({
                    count,
                    duplicatesSkipped,
                    outAmount,
                    type: "commitSucceeded",
                });
                importDraftStore.setStep("done");
            })
            .catch((cause: unknown) => {
                importDraftStore.dispatch({
                    detail: cause instanceof Error ? cause.message : null,
                    type: "commitFailed",
                });
            });
    }, [db, plan, flow.excluded, flow.duplicates, haptics]);

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
