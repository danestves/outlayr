import { SUGGESTED_CATEGORY_PRESETS } from "@/data/categories-core";
import { formatSignedAmount } from "@/domain/account-display";
import { formatFixed } from "@/domain/money";
import type { TranslateFn } from "@/i18n/context";
import type { MoneyManagerDraft } from "@/lib/money-manager-session";

import type { ImportRowProps } from "./components/import-row";

type Target = NonNullable<ImportRowProps["target"]>;

/** Stems with `.one` / `.other` twins: `t`'s own plurals print a raw count, these print it grouped. */
export type CountedStem =
    | "mmImport.accountSheet.leaveOutDetail"
    | "mmImport.count.accounts"
    | "mmImport.count.budgets"
    | "mmImport.count.categories"
    | "mmImport.count.entries"
    | "mmImport.done.allMatch"
    | "mmImport.done.more"
    | "mmImport.overview.import"
    | "mmImport.overview.pairs"
    | "mmImport.overview.startSkipMatches"
    | "mmImport.uncategorized.morePairs"
    | "mmImport.uncategorized.pairsTitle";

export function tc(t: TranslateFn, stem: CountedStem, n: number, params?: Record<string, string>): string {
    const key = n === 1 ? (`${stem}.one` as const) : (`${stem}.other` as const);
    return t(key, { shown: formatFixed(n, 0), ...params });
}

export function grouped(n: number): string {
    return formatFixed(n, 0);
}

// Balances can sit below zero, and a bare amount would read an overdrawn account as money in hand.
export function money(amount: number, currency: string): string {
    return formatSignedAmount(amount, currency);
}

export function accountTitle(draft: MoneyManagerDraft, uid: string): string {
    return draft.analysis.accounts.find((account) => account.uid === uid)?.title ?? "";
}

/** The account row's right-hand side: quiet for the default, loud when it lands somewhere else. */
export function accountTarget(draft: MoneyManagerDraft, uid: string, t: TranslateFn): Target {
    const target = draft.choices.accounts[uid];
    if (target === undefined || target.kind === "skip") {
        return { label: t("mmImport.target.leftOut"), loud: true };
    }
    if (target.kind === "merge") {
        // A merge can point at an account that joined another one; name where the entries finally land.
        const into = draft.choices.accounts[target.intoUid];
        if (into?.kind === "merge" || into?.kind === "existing") {
            return accountTarget(draft, target.intoUid, t);
        }
        return { label: t("mmImport.target.into", { name: accountTitle(draft, target.intoUid) }), loud: true };
    }
    if (target.kind === "existing") {
        const name = draft.ledger.accounts.find((account) => account.id === target.accountId)?.name ?? "";
        return { how: t("mmImport.target.howExisting"), label: t("mmImport.target.into", { name }), loud: true };
    }
    return { label: t(target.accountKind === "liability" ? "mmImport.target.newCard" : "mmImport.target.new") };
}

export function categoryName(
    draft: MoneyManagerDraft,
    parent: { categoryId: string } | { presetName: string } | { mmUid: string }
): string {
    if ("categoryId" in parent) {
        return draft.ledger.categories.find((category) => category.id === parent.categoryId)?.name ?? "";
    }
    if ("presetName" in parent) {
        return parent.presetName;
    }
    const target = draft.choices.categories[parent.mmUid];
    if (target?.kind === "existing" || target?.kind === "preset") {
        return categoryName(draft, target.kind === "existing" ? { categoryId: target.categoryId } : target);
    }
    return draft.analysis.categories.find((category) => category.uid === parent.mmUid)?.title ?? "";
}

export function categoryTarget(draft: MoneyManagerDraft, uid: string, t: TranslateFn): Target {
    const target = draft.choices.categories[uid];
    const view = draft.analysis.categories.find((category) => category.uid === uid);
    const title = view?.title ?? "";
    if (target === undefined || target.kind === "skip") {
        const unused = (view?.entryCount ?? 0) === 0;
        return { label: t(unused ? "mmImport.target.noEntries" : "mmImport.target.leftOut"), loud: !unused };
    }
    if (target.kind === "existing" || target.kind === "preset") {
        return { how: t("mmImport.target.howMatched"), label: categoryName(draft, target), tone: "matched" };
    }
    if (target.kind === "sub") {
        return {
            how: t("mmImport.target.howIn", { parent: categoryName(draft, target.parent) }),
            label: title,
            tone: "nested",
        };
    }
    return { how: t("mmImport.target.howNew"), label: title };
}

/** Matched lands on an Outlayr category; created makes one, nested or not. */
export function categoryTally(draft: MoneyManagerDraft) {
    let matched = 0;
    let created = 0;
    for (const target of Object.values(draft.choices.categories)) {
        if (target.kind === "existing" || target.kind === "preset") {
            matched += 1;
        } else if (target.kind === "new" || target.kind === "sub") {
            created += 1;
        }
    }
    return { created, matched };
}

/** The tile a Money Manager category wears once it lands on an Outlayr category, or its own when it keeps it. */
export function categoryLook(draft: MoneyManagerDraft, uid: string) {
    const view = draft.analysis.categories.find((category) => category.uid === uid);
    const own = { color: view?.color ?? "", icon: view?.icon ?? null };
    const target = draft.choices.categories[uid];
    if (target?.kind === "existing") {
        const live = draft.ledger.categories.find((category) => category.id === target.categoryId);
        return live?.color ? { color: live.color, icon: live.icon } : own;
    }
    if (target?.kind === "preset") {
        const pool = view?.income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
        const preset = pool.find((item) => item.name === target.presetName);
        return preset ? { color: preset.color, icon: preset.icon } : own;
    }
    return own;
}
