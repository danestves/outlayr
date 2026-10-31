import { presetLabel } from "@/data/categories-core";

import { iconFamilyPreset, normalizeLabel, presetForMoneyManager } from "./matching";
import type { AccountTarget, CategoryTarget, MmAnalysis, MmChoices, MmSnapshot, OutlayrLedgerState } from "./types";

type CategoryParent = Extract<CategoryTarget, { kind: "sub" }>["parent"];

export function keepModeCategories(snapshot: MmSnapshot, analysis: MmAnalysis, ledger: OutlayrLedgerState) {
    const removed = new Set(snapshot.categories.filter((category) => category.removed).map((category) => category.uid));
    const choices = new Map<string, CategoryTarget>();
    for (const view of analysis.categories) {
        if (removed.has(view.uid)) {
            continue;
        }
        if (view.entryCount === 0 && view.limit == null) {
            choices.set(view.uid, { kind: "skip" });
            continue;
        }
        const existing = ledger.categories.find(
            (category) =>
                category.income === view.income && normalizeLabel(category.name) === normalizeLabel(view.title)
        );
        choices.set(view.uid, existing == null ? { kind: "new" } : { kind: "existing", categoryId: existing.id });
    }
    return Object.fromEntries(choices);
}

function matchCategories(snapshot: MmSnapshot, analysis: MmAnalysis, ledger: OutlayrLedgerState) {
    const byUid = new Map(snapshot.categories.map((category) => [category.uid, category]));
    const choices = new Map<string, CategoryTarget>();
    const undecided: string[] = [];
    for (const view of analysis.categories) {
        if (view.entryCount === 0 && view.limit == null) {
            choices.set(view.uid, { kind: "skip" });
            continue;
        }
        const existing = ledger.categories.find(
            (category) =>
                category.income === view.income && normalizeLabel(category.name) === normalizeLabel(view.title)
        );
        if (existing != null) {
            choices.set(view.uid, { kind: "existing", categoryId: existing.id });
            continue;
        }
        const source = byUid.get(view.uid);
        const preset = presetForMoneyManager(view.title, source?.mmIcon ?? null, view.income);
        if (preset != null) {
            const presetRow = ledger.categories.find(
                (category) =>
                    category.income === view.income &&
                    (category.preset === preset ||
                        normalizeLabel(category.name) === normalizeLabel(preset) ||
                        normalizeLabel(category.name) === normalizeLabel(presetLabel(preset)))
            );
            choices.set(
                view.uid,
                presetRow == null
                    ? { kind: "preset", presetName: preset }
                    : { kind: "existing", categoryId: presetRow.id }
            );
            continue;
        }
        undecided.push(view.uid);
    }

    for (const uid of undecided) {
        const source = byUid.get(uid);
        const family = source == null ? null : iconFamilyPreset(source.mmIcon, source.income);
        const parent =
            family == null || source == null ? null : familyOwner(family, source.income, uid, choices, byUid, ledger);
        choices.set(uid, parent == null || source == null ? { kind: "new" } : { kind: "sub", parent });
    }
    return Object.fromEntries(choices);
}

function familyOwner(
    family: string,
    income: boolean,
    selfUid: string,
    choices: ReadonlyMap<string, CategoryTarget>,
    categories: ReadonlyMap<string, MmSnapshot["categories"][number]>,
    ledger: OutlayrLedgerState
): CategoryParent | null {
    const familyLabel = normalizeLabel(family);
    for (const [uid, target] of choices) {
        if (uid === selfUid) {
            continue;
        }
        const category = categories.get(uid);
        if (category == null || category.income !== income) {
            continue;
        }
        if (target.kind === "preset" && target.presetName === family) {
            return { presetName: family };
        }
        if (target.kind === "existing") {
            const row = ledger.categories.find((item) => item.id === target.categoryId);
            if (row != null && (row.preset === family || normalizeLabel(row.name) === familyLabel)) {
                return { categoryId: row.id };
            }
        }
        if (target.kind === "new" && normalizeLabel(category.title) === familyLabel) {
            return { mmUid: uid };
        }
    }
    return null;
}

function importable(view: MmAnalysis["accounts"][number]): boolean {
    return view.entryCount > 0 || (view.balance != null && view.balance !== 0);
}

function accountChoices(analysis: MmAnalysis, ledger: OutlayrLedgerState) {
    const choices = new Map<string, AccountTarget>();
    const groups = new Map<string, MmAnalysis["accounts"][number][]>();
    for (const view of analysis.accounts) {
        if (view.group === "deleted") {
            continue;
        }
        const key = `${normalizeLabel(view.title)}|${view.currency}`;
        const list = groups.get(key);
        if (list == null) {
            groups.set(key, [view]);
        } else {
            list.push(view);
        }
    }
    for (const group of groups.values()) {
        if (!group.some(importable)) {
            for (const view of group) {
                choices.set(view.uid, { kind: "skip" });
            }
            continue;
        }
        const [fallback] = group;
        const target = group.find((view) => view.group === "open") ?? group.find(importable) ?? fallback;
        if (target == null) {
            continue;
        }
        const existing = ledger.accounts.find(
            (account) =>
                normalizeLabel(account.name) === normalizeLabel(target.title) && account.currency === target.currency
        );
        choices.set(
            target.uid,
            existing == null
                ? { accountKind: target.suggestedKind, kind: "new" }
                : { accountId: existing.id, kind: "existing" }
        );
        for (const view of group) {
            if (view.uid === target.uid) {
                continue;
            }
            if (importable(view)) {
                choices.set(
                    view.uid,
                    existing == null
                        ? { intoUid: target.uid, kind: "merge" }
                        : { accountId: existing.id, kind: "existing" }
                );
            } else {
                choices.set(view.uid, { kind: "skip" });
            }
        }
    }
    return Object.fromEntries(choices);
}

export function defaultChoices(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    ledger: OutlayrLedgerState,
    categoryMode: MmChoices["categoryMode"] = "match"
): MmChoices {
    const categories =
        categoryMode === "keep"
            ? keepModeCategories(snapshot, analysis, ledger)
            : matchCategories(snapshot, analysis, ledger);
    const budgets: Record<string, boolean> = {};
    for (const view of analysis.categories) {
        const target = categories[view.uid];
        if (view.limit != null && target != null && target.kind !== "skip") {
            budgets[view.uid] = true;
        }
    }
    const matchBalances: Record<string, boolean> = {};
    for (const gap of analysis.balanceGaps) {
        matchBalances[gap.accountUid] = true;
    }
    return {
        accounts: accountChoices(analysis, ledger),
        budgets,
        categories,
        categoryMode,
        matchBalances,
        pairsAsTransfers: true,
        start: analysis.overlap == null ? { kind: "all" } : { kind: "cutoff" },
        uncategorized: "leave",
    };
}
