import { matches } from "./rules";
import type { Action, CategoryKinds, Condition, Rule, RuleEntry } from "./rules";

type TextCondition = Extract<Condition, { field: "merchant" | "description" }>;

export interface TextSeed {
    field: TextCondition["field"];
    op: TextCondition["op"];
    shared: boolean;
    value: string;
}

export interface Seed<T> {
    shared: boolean;
    value: T;
}

export interface SelectionSeed {
    accountId: string | null;
    category: Seed<string> | null;
    covered: readonly RuleEntry[];
    description: TextSeed | null;
    merchant: TextSeed | null;
    skipped: number;
    tags: readonly Seed<string>[];
}

const PREFIX_MIN = 3;
const TRAILING_JUNK = /[^\p{L}\p{N}]+$/u;

const fold = (text: string) => text.trim().toLocaleLowerCase();

function mostCommon(values: readonly string[]) {
    const counts = new Map<string, number>();
    for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function commonPrefix(texts: readonly string[]) {
    const [first = "", ...rest] = texts;
    let { length } = first;
    for (const text of rest) {
        length = Math.min(length, text.length);
        let at = 0;
        while (at < length && fold(text[at] ?? "") === fold(first[at] ?? "")) {
            at += 1;
        }
        length = at;
    }
    return first.slice(0, length).replace(TRAILING_JUNK, "");
}

/** Every entry has the same text: is it. Every entry starts the same: starts with it. */
export function textSeedOf(field: TextSeed["field"], texts: readonly string[]): TextSeed | null {
    const trimmed = texts.map((text) => text.trim());
    const filled = trimmed.filter((text) => text !== "");
    const [first] = filled;
    if (first === undefined) {
        return null;
    }
    if (filled.length === trimmed.length) {
        if (filled.every((text) => fold(text) === fold(first))) {
            return { field, op: "is", shared: true, value: first };
        }
        const prefix = commonPrefix(filled);
        if (prefix.length >= PREFIX_MIN) {
            return { field, op: "startsWith", shared: true, value: prefix };
        }
    }
    const top = mostCommon(filled.map((text) => fold(text)));
    const value = filled.find((text) => fold(text) === top) ?? first;
    return { field, op: "is", shared: false, value };
}

/**
 * Seeds a rule from selected entries. `entries` are the ones rules can see, so transfers,
 * fees and installment payments in the selection only count towards `skipped`.
 */
export function selectionSeedOf(
    entries: readonly RuleEntry[],
    selected: readonly { accountId: string | null; id: string }[],
    kinds: CategoryKinds
): SelectionSeed {
    const ids = new Set(selected.map((row) => row.id));
    const covered = entries.filter((entry) => ids.has(entry.id));
    const coveredIds = new Set(covered.map((entry) => entry.id));
    const accounts = new Set(selected.filter((row) => coveredIds.has(row.id)).map((row) => row.accountId));
    const [account = null] = accounts;
    const categories = covered.map((entry) => entry.categoryId);
    const live = categories.flatMap((id) => (id !== null && kinds.has(id) ? [id] : []));
    const category = mostCommon(live);
    const tagIds = [...new Set(covered.flatMap((entry) => [...entry.tagIds]))];
    const tags = tagIds
        .map((tagId) => ({ shared: covered.every((entry) => entry.tagIds.has(tagId)), value: tagId }))
        .toSorted((a, b) => Number(b.shared) - Number(a.shared));
    const merchant = textSeedOf(
        "merchant",
        covered.map((entry) => entry.note)
    );
    const description = textSeedOf(
        "description",
        covered.map((entry) => entry.details)
    );
    return {
        accountId: accounts.size === 1 ? account : null,
        category:
            category === null
                ? null
                : { shared: live.length === covered.length && new Set(live).size === 1, value: category },
        covered,
        // Merchant and description together narrow the rule to both, so the description leads only without a merchant.
        description: description && merchant?.shared ? { ...description, shared: false } : description,
        merchant,
        skipped: selected.length - covered.length,
        tags,
    };
}

export interface RulePicks {
    categoryId: string | null;
    conditions: readonly TextSeed[];
    name: string;
    tagIds: readonly string[];
}

export function ruleFromPicks(picks: RulePicks, id: string): Rule {
    const actions: Action[] = [
        ...(picks.categoryId === null ? [] : [{ categoryId: picks.categoryId, type: "category" as const }]),
        ...picks.tagIds.map((tagId) => ({ tagId, type: "tag" as const })),
    ];
    return {
        actions,
        conditions: picks.conditions.map(({ field, op, value }) => ({ field, op, value: value.trim() })),
        id,
        match: "all",
        name: picks.name.trim(),
        on: true,
    };
}

export const matchedBy = (rule: Rule, entries: readonly RuleEntry[], kinds: CategoryKinds) =>
    entries.filter((entry) => matches(rule, entry, kinds)).length;
