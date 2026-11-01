import {
    CATEGORY_PALETTE,
    capitalizeCategoryName,
    presetFor,
    presetLabel,
    SUGGESTED_CATEGORY_PRESETS,
} from "@/data/categories-core";

import { matchedEntryUids } from "./analysis";
import { nearestPaletteColor, normalizeLabel, outlayrIconFor, suggestAccountKind } from "./matching";
import type {
    CategoryTarget,
    MmAnalysis,
    MmChoices,
    MmEntry,
    MmCategoryView,
    MmImportPlan,
    MmSnapshot,
    MmTransfer,
    OutlayrLedgerState,
    PlannedAccount,
    PlannedCategory,
    PlannedEntry,
    PlannedTransfer,
} from "./types";

const OTHER_ICON = "MoreHorizontalCircle01";

export function entryDate(day: string, createdAt: number): Date {
    const created = new Date(createdAt);
    if (!Number.isNaN(created.getTime()) && localDay(created) === day) {
        return created;
    }
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1, 12, 0, 0, 0);
}

function localDay(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function localMidnight(day: string): Date {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
}

interface Face {
    amount: number;
    currency: string;
}

// Outlayr values a foreign entry on a non-USD account at that day's market rate, which drifts from what Money Manager
// booked, so the entry comes over at the amount the account was actually charged.
function bookedFace(entry: MmEntry, accountCurrency: string | undefined): Face {
    if (
        accountCurrency != null &&
        accountCurrency !== "USD" &&
        entry.currency !== accountCurrency &&
        entry.accountAmount != null &&
        entry.accountAmount > 0
    ) {
        return { amount: entry.accountAmount, currency: accountCurrency };
    }
    return { amount: entry.amount, currency: entry.currency };
}

// Official rates older than ~90 days are often missing, so the backup's own conversion is frozen.
function frozenRate(face: Face, defaultAmount: number | null, defaultCurrency: string): number | null {
    if (
        face.currency !== "USD" &&
        defaultCurrency === "USD" &&
        defaultAmount != null &&
        defaultAmount > 0 &&
        face.amount > 0
    ) {
        return face.amount / defaultAmount;
    }
    return null;
}

function resolveAccount(uid: string, choices: MmChoices["accounts"], seen = new Set<string>()): string | null {
    if (seen.has(uid)) {
        return null;
    }
    seen.add(uid);
    const choice = choices[uid];
    if (choice == null || choice.kind === "skip") {
        return null;
    }
    if (choice.kind === "merge") {
        return resolveAccount(choice.intoUid, choices, seen);
    }
    return uid;
}

function memberUids(target: string, choices: MmChoices["accounts"]): string[] {
    const members = [target];
    for (const [uid, choice] of Object.entries(choices)) {
        if (choice.kind === "merge" && resolveAccount(uid, choices) === target) {
            members.push(uid);
        }
    }
    return members;
}

function cents(amount: number): number {
    return Math.round(amount * 100);
}

function presetKey(name: string, income: boolean): string {
    return `preset:${income ? "in" : "out"}:${name}`;
}

function categoryChoiceKey(
    uid: string,
    income: boolean,
    choices: Record<string, CategoryTarget>,
    planned: Map<string, PlannedCategory>
): string | null {
    const choice = choices[uid];
    if (choice == null || choice.kind === "skip") {
        return null;
    }
    if (choice.kind === "preset") {
        return ensurePreset(choice.presetName, income, planned);
    }
    if (choice.kind === "existing") {
        return ensureExisting(choice.categoryId, income, planned);
    }
    return `mm:${uid}`;
}

export function matchedKey(target: CategoryTarget, income: boolean): string | null {
    if (target.kind === "preset") {
        return presetKey(target.presetName, income);
    }
    return target.kind === "existing" ? `existing:${target.categoryId}` : null;
}

function plannedLabels(choices: MmChoices, ledger: OutlayrLedgerState, income: boolean, own: string): Set<string> {
    const labels = ledger.categories
        .filter((category) => category.income === income && `existing:${category.id}` !== own)
        .map((category) => category.name);
    for (const target of Object.values(choices.categories)) {
        if (target.kind === "preset" && presetKey(target.presetName, income) !== own) {
            labels.push(presetLabel(target.presetName));
        }
        if (target.kind === "sub" && "presetName" in target.parent) {
            labels.push(presetLabel(target.parent.presetName));
        }
    }
    return new Set(labels.map(capitalizeCategoryName));
}

function untouchedPreset(row: OutlayrLedgerState["categories"][number] | undefined): boolean {
    return (
        row?.preset != null &&
        !row.customName &&
        capitalizeCategoryName(row.name) === capitalizeCategoryName(presetLabel(row.preset))
    );
}

export function keptCategoryNames(
    analysis: MmAnalysis,
    choices: MmChoices,
    ledger: OutlayrLedgerState
): Map<string, string> {
    const sources = new Map<string, MmCategoryView[]>();
    for (const view of analysis.categories) {
        const target = choices.categories[view.uid];
        const key = target == null ? null : matchedKey(target, view.income);
        if (key != null) {
            sources.set(key, [...(sources.get(key) ?? []), view]);
        }
    }
    const kept = new Map<string, string>();
    for (const [key, views] of sources) {
        const [view] = views;
        if (view == null || views.length > 1) {
            continue;
        }
        const name = capitalizeCategoryName(view.title);
        if (name === "") {
            continue;
        }
        if (key.startsWith("existing:")) {
            const row = ledger.categories.find((category) => `existing:${category.id}` === key);
            if (!untouchedPreset(row) || capitalizeCategoryName(row?.name ?? "") === name) {
                continue;
            }
        }
        const others = analysis.categories.filter(
            (other) =>
                other.uid !== view.uid &&
                other.income === view.income &&
                choices.categories[other.uid]?.kind !== "skip" &&
                capitalizeCategoryName(other.title) === name
        );
        if (others.length === 0 && !plannedLabels(choices, ledger, view.income, key).has(name)) {
            kept.set(key, name);
        }
    }
    return kept;
}

function ensurePreset(name: string, income: boolean, planned: Map<string, PlannedCategory>): string {
    const key = presetKey(name, income);
    if (!planned.has(key)) {
        const pool = income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
        const preset = pool.find((item) => item.name === name);
        planned.set(key, {
            color: preset?.color ?? CATEGORY_PALETTE[0],
            existingId: null,
            icon: preset?.icon ?? OTHER_ICON,
            income,
            key,
            name: presetLabel(name),
            parent: null,
            preset: presetFor(name, income),
        });
    }
    return key;
}

function ensureExisting(
    id: string,
    income: boolean,
    planned: Map<string, PlannedCategory>,
    ledger?: OutlayrLedgerState
): string {
    const key = `existing:${id}`;
    if (!planned.has(key)) {
        const row = ledger?.categories.find((category) => category.id === id);
        planned.set(key, {
            color: row?.color ?? CATEGORY_PALETTE[0],
            existingId: id,
            icon: row?.icon ?? OTHER_ICON,
            income: row?.income ?? income,
            key,
            name: row?.name ?? "",
            parent: null,
        });
    }
    return key;
}

/** A parent named by another Money Manager category follows wherever that category lands, or drops when left out. */
function parentOf(
    choice: Extract<CategoryTarget, { kind: "sub" }>,
    income: boolean,
    planned: Map<string, PlannedCategory>,
    choices: Record<string, CategoryTarget>
): PlannedCategory["parent"] {
    if ("categoryId" in choice.parent) {
        return { categoryId: choice.parent.categoryId };
    }
    if ("presetName" in choice.parent) {
        return { key: ensurePreset(choice.parent.presetName, income, planned) };
    }
    const owner = choices[choice.parent.mmUid];
    if (owner?.kind === "existing") {
        return { categoryId: owner.categoryId };
    }
    if (owner?.kind === "preset") {
        return { key: ensurePreset(owner.presetName, income, planned) };
    }
    if (owner?.kind === "new") {
        return { key: `mm:${choice.parent.mmUid}` };
    }
    return null;
}

function orderCategories(categories: PlannedCategory[]): PlannedCategory[] {
    const pending = [...categories];
    const placed = new Set<string>();
    const ordered: PlannedCategory[] = [];
    while (pending.length > 0) {
        const index = pending.findIndex(
            (category) => category.parent == null || !("key" in category.parent) || placed.has(category.parent.key)
        );
        if (index === -1) {
            ordered.push(...pending);
            break;
        }
        const [category] = pending.splice(index, 1);
        if (category == null) {
            break;
        }
        ordered.push(category);
        placed.add(category.key);
    }
    return ordered;
}

function droppedEntry(entry: MmEntry, choices: MmChoices, analysis: MmAnalysis, matched: ReadonlySet<string>): boolean {
    if (choices.start.kind === "cutoff") {
        return analysis.overlap != null && entry.day >= analysis.overlap.outlayrFirstDay;
    }
    if (choices.start.kind === "skipMatches") {
        return matched.has(entry.uid);
    }
    return false;
}

function droppedTransfer(transfer: MmTransfer, choices: MmChoices, analysis: MmAnalysis): boolean {
    return (
        choices.start.kind === "cutoff" && analysis.overlap != null && transfer.day >= analysis.overlap.outlayrFirstDay
    );
}

function transferNote(title: string | undefined): string {
    const trimmed = title?.trim() ?? "";
    return trimmed === "" ? "Transfer" : `Transfer ${trimmed}`;
}

function planAccounts(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    choices: MmChoices,
    ledger: OutlayrLedgerState
): PlannedAccount[] {
    const accountByUid = new Map(snapshot.accounts.map((account) => [account.uid, account]));
    const viewByUid = new Map(analysis.accounts.map((account) => [account.uid, account]));
    const gapByUid = new Map(analysis.balanceGaps.map((gap) => [gap.accountUid, gap]));
    const accounts: PlannedAccount[] = [];
    for (const [uid, choice] of Object.entries(choices.accounts)) {
        if (choice.kind !== "new" && choice.kind !== "existing") {
            continue;
        }
        const source = accountByUid.get(uid);
        const view = viewByUid.get(uid);
        if (source == null) {
            continue;
        }
        const members = memberUids(uid, choices.accounts);
        const days = snapshot.entries
            .filter((entry) => entry.accountUid != null && members.includes(entry.accountUid) && entry.day !== "")
            .map((entry) => entry.day)
            .sort();
        let gapCents = 0;
        let hasGap = false;
        let storedCents = 0;
        let hasStored = false;
        for (const member of members) {
            const memberAccount = accountByUid.get(member);
            if (memberAccount?.storedBalance != null) {
                storedCents += cents(memberAccount.storedBalance);
                hasStored = true;
            }
            if (choices.matchBalances[member] !== true) {
                continue;
            }
            const gap = gapByUid.get(member);
            if (gap == null) {
                continue;
            }
            gapCents += cents(gap.stored - gap.computed);
            hasGap = true;
        }
        const ledgerAccount =
            choice.kind === "existing" ? ledger.accounts.find((account) => account.id === choice.accountId) : undefined;
        const [firstDay] = days;
        accounts.push({
            color: view?.color ?? nearestPaletteColor(source.mmColor),
            currency: source.currency,
            existingId: choice.kind === "existing" ? choice.accountId : null,
            // An existing account already holds its own balance, so Money Manager's alone says nothing about it.
            expectedBalance: hasStored && choice.kind !== "existing" ? storedCents / 100 : null,
            icon: view?.icon ?? outlayrIconFor(source.mmIcon),
            initialBalance: choice.kind === "existing" || !hasGap ? 0 : gapCents / 100,
            initialBalanceDate: firstDay == null ? new Date() : localMidnight(firstDay),
            key: uid,
            kind:
                choice.kind === "new"
                    ? choice.accountKind
                    : (ledgerAccount?.kind ?? suggestAccountKind(source.title, source.mmIcon, source.storedBalance)),
            name: source.title.trim(),
        });
    }
    return accounts;
}

function planCategories(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    choices: MmChoices,
    ledger: OutlayrLedgerState
): Map<string, PlannedCategory> {
    const planned = new Map<string, PlannedCategory>();
    const categoryByUid = new Map(snapshot.categories.map((category) => [category.uid, category]));
    const kept = keptCategoryNames(analysis, choices, ledger);
    for (const view of analysis.categories) {
        const choice = choices.categories[view.uid];
        const source = categoryByUid.get(view.uid);
        if (choice == null || choice.kind === "skip" || source == null) {
            continue;
        }
        if (choice.kind === "preset" || choice.kind === "existing") {
            const key =
                choice.kind === "preset"
                    ? ensurePreset(choice.presetName, view.income, planned)
                    : ensureExisting(choice.categoryId, view.income, planned, ledger);
            const name = kept.get(key);
            const category = planned.get(key);
            if (name != null && category != null) {
                planned.set(key, { ...category, name, ...(category.existingId != null && { renamesExisting: true }) });
            }
        } else if (choice.kind === "new") {
            const key = `mm:${view.uid}`;
            planned.set(key, {
                color: view.color,
                existingId: null,
                icon: view.icon,
                income: view.income,
                key,
                name: view.title.trim(),
                parent: null,
            });
        } else {
            const key = `mm:${view.uid}`;
            planned.set(key, {
                color: view.color,
                existingId: null,
                icon: view.icon,
                income: view.income,
                key,
                name: view.title.trim(),
                parent: parentOf(choice, view.income, planned, choices.categories),
            });
        }
    }
    return planned;
}

function planPairTransfers(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    choices: MmChoices,
    matched: ReadonlySet<string>
) {
    const consumed = new Set<string>();
    const transfers: PlannedTransfer[] = [];
    if (!choices.pairsAsTransfers) {
        return { consumed, transfers };
    }
    for (const pair of analysis.uncategorized.pairs) {
        const outgoing = snapshot.entries.find((entry) => entry.uid === pair.outUid);
        const incoming = snapshot.entries.find((entry) => entry.uid === pair.inUid);
        if (outgoing == null || incoming == null) {
            continue;
        }
        if (droppedEntry(outgoing, choices, analysis, matched) || droppedEntry(incoming, choices, analysis, matched)) {
            continue;
        }
        const fromKey = outgoing.accountUid == null ? null : resolveAccount(outgoing.accountUid, choices.accounts);
        const toKey = incoming.accountUid == null ? null : resolveAccount(incoming.accountUid, choices.accounts);
        if (fromKey == null || toKey == null || fromKey === toKey || !(outgoing.amount > 0 && incoming.amount > 0)) {
            continue;
        }
        consumed.add(outgoing.uid);
        consumed.add(incoming.uid);
        transfers.push({
            date: entryDate(outgoing.day, outgoing.createdAt),
            fromAccountKey: fromKey,
            fromAmount: outgoing.amount,
            fromCurrency: outgoing.currency,
            note: "",
            toAccountKey: toKey,
            toAmount: incoming.amount,
            toCurrency: incoming.currency,
        });
    }
    return { consumed, transfers };
}

function planPlainEntries(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    choices: MmChoices,
    planned: Map<string, PlannedCategory>,
    matched: ReadonlySet<string>,
    consumed: ReadonlySet<string>
): PlannedEntry[] {
    const entries: PlannedEntry[] = [];
    // Merges and existing targets share the source account's currency, so the source's is the target's.
    const accountCurrency = new Map(snapshot.accounts.map((account) => [account.uid, account.currency]));
    for (const entry of snapshot.entries) {
        if (consumed.has(entry.uid) || droppedEntry(entry, choices, analysis, matched)) {
            continue;
        }
        const categoryKey =
            entry.categoryUid == null
                ? null
                : categoryChoiceKey(entry.categoryUid, entry.income, choices.categories, planned);
        const face = bookedFace(entry, accountCurrency.get(entry.accountUid ?? ""));
        entries.push({
            accountKey: entry.accountUid == null ? null : resolveAccount(entry.accountUid, choices.accounts),
            amount: face.amount,
            categoryKey,
            currency: face.currency,
            date: entryDate(entry.day, entry.createdAt),
            exchangeRate: frozenRate(face, entry.defaultAmount, snapshot.defaultCurrency),
            income: entry.income,
            note: entry.note.trim(),
            unreviewed: false,
        });
    }
    return entries;
}

function planRecordedTransfers(snapshot: MmSnapshot, analysis: MmAnalysis, choices: MmChoices) {
    const accountByUid = new Map(snapshot.accounts.map((account) => [account.uid, account]));
    const entries: PlannedEntry[] = [];
    const transfers: PlannedTransfer[] = [];
    for (const transfer of snapshot.transfers) {
        if (droppedTransfer(transfer, choices, analysis)) {
            continue;
        }
        const fromKey =
            transfer.fromAccountUid == null ? null : resolveAccount(transfer.fromAccountUid, choices.accounts);
        const toKey = transfer.toAccountUid == null ? null : resolveAccount(transfer.toAccountUid, choices.accounts);
        if (fromKey != null && toKey != null && fromKey !== toKey && transfer.fromAmount > 0 && transfer.toAmount > 0) {
            transfers.push({
                date: entryDate(transfer.day, transfer.createdAt),
                fromAccountKey: fromKey,
                fromAmount: transfer.fromAmount,
                fromCurrency: transfer.fromCurrency,
                note: transfer.note,
                toAccountKey: toKey,
                toAmount: transfer.toAmount,
                toCurrency: transfer.toCurrency,
            });
            continue;
        }
        if (fromKey != null && toKey == null && transfer.fromAmount > 0) {
            entries.push(
                transferEntry(
                    transfer,
                    fromKey,
                    false,
                    transfer.fromAmount,
                    transfer.fromCurrency,
                    accountByUid.get(transfer.toAccountUid ?? "")?.title
                )
            );
        } else if (toKey != null && fromKey == null && transfer.toAmount > 0) {
            entries.push(
                transferEntry(
                    transfer,
                    toKey,
                    true,
                    transfer.toAmount,
                    transfer.toCurrency,
                    accountByUid.get(transfer.fromAccountUid ?? "")?.title
                )
            );
        }
    }
    return { entries, transfers };
}

function planBudgets(
    analysis: MmAnalysis,
    choices: MmChoices,
    ledger: OutlayrLedgerState,
    planned: Map<string, PlannedCategory>
): MmImportPlan["budgets"] {
    const budgetSums = new Map<string, number>();
    for (const view of analysis.categories) {
        if (view.limit == null || choices.budgets[view.uid] !== true) {
            continue;
        }
        const target = choices.categories[view.uid];
        if (target == null || target.kind === "skip") {
            continue;
        }
        const key = categoryChoiceKey(view.uid, view.income, choices.categories, planned);
        if (key == null) {
            continue;
        }
        const plannedCategory = planned.get(key);
        if (plannedCategory?.existingId != null && ledger.budgetCategoryIds.includes(plannedCategory.existingId)) {
            continue;
        }
        budgetSums.set(key, (budgetSums.get(key) ?? 0) + view.limit);
    }
    return [...budgetSums.entries()].map(([categoryKey, amount]) => ({ amount, categoryKey }));
}

export function buildImportPlan(
    snapshot: MmSnapshot,
    analysis: MmAnalysis,
    choices: MmChoices,
    ledger: OutlayrLedgerState
): MmImportPlan {
    const accounts = planAccounts(snapshot, analysis, choices, ledger);
    const planned = planCategories(snapshot, analysis, choices, ledger);
    const matched =
        analysis.overlap == null
            ? new Set<string>()
            : matchedEntryUids(snapshot, ledger, analysis.overlap.outlayrFirstDay);
    const pairs = planPairTransfers(snapshot, analysis, choices, matched);
    const entries = planPlainEntries(snapshot, analysis, choices, planned, matched, pairs.consumed);
    const recorded = planRecordedTransfers(snapshot, analysis, choices);
    entries.push(...recorded.entries);
    const transfers = [...pairs.transfers, ...recorded.transfers];
    applyUncategorized(entries, choices.uncategorized, planned, ledger);
    entries.sort((left, right) => left.date.getTime() - right.date.getTime());
    transfers.sort((left, right) => left.date.getTime() - right.date.getTime());
    return {
        accounts,
        budgets: planBudgets(analysis, choices, ledger, planned),
        categories: orderCategories([...planned.values()]),
        entries,
        ledgerCurrency: ledger.currencyChosen ? null : snapshot.defaultCurrency,
        transfers,
    };
}

function transferEntry(
    transfer: MmTransfer,
    accountKey: string,
    income: boolean,
    amount: number,
    currency: string,
    otherTitle: string | undefined
): PlannedEntry {
    return {
        accountKey,
        amount,
        categoryKey: null,
        currency,
        date: entryDate(transfer.day, transfer.createdAt),
        exchangeRate: null,
        income,
        note: transferNote(otherTitle),
        unreviewed: false,
    };
}

function applyUncategorized(
    entries: PlannedEntry[],
    choice: MmChoices["uncategorized"],
    planned: Map<string, PlannedCategory>,
    ledger: OutlayrLedgerState
): void {
    if (choice === "leave") {
        return;
    }
    const needs = { expense: false, income: false };
    for (const entry of entries) {
        if (entry.categoryKey == null) {
            if (entry.income) {
                needs.income = true;
            } else {
                needs.expense = true;
            }
        }
    }
    if (choice === "review") {
        for (const entry of entries) {
            entry.unreviewed = entry.categoryKey == null;
        }
        return;
    }
    if (needs.expense) {
        const key = otherKey(false, planned, ledger);
        for (const entry of entries) {
            if (!entry.income && entry.categoryKey == null) {
                entry.categoryKey = key;
            }
        }
    }
    if (needs.income) {
        const key = otherKey(true, planned, ledger);
        for (const entry of entries) {
            if (entry.income && entry.categoryKey == null) {
                entry.categoryKey = key;
            }
        }
    }
}

function otherKey(income: boolean, planned: Map<string, PlannedCategory>, ledger: OutlayrLedgerState): string {
    const name = income ? "Other income" : "Other";
    const label = normalizeLabel(name);
    for (const category of planned.values()) {
        if (category.income === income && normalizeLabel(category.name) === label) {
            return category.key;
        }
    }
    const existing = ledger.categories.find(
        (category) => category.income === income && normalizeLabel(category.name) === label
    );
    if (existing != null) {
        return ensureExisting(existing.id, income, planned, ledger);
    }
    const key = income ? "other:in" : "other:out";
    planned.set(key, {
        color: CATEGORY_PALETTE[income ? 12 : 0],
        existingId: null,
        icon: OTHER_ICON,
        income,
        key,
        name,
        parent: null,
    });
    return key;
}
