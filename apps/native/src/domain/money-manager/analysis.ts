import { nearestPaletteColor, outlayrIconFor, suggestAccountKind } from "./matching";
import type {
    MmAccount,
    MmAnalysis,
    MmBalanceGap,
    MmEntry,
    MmSnapshot,
    MmTransferPair,
    OutlayrLedgerState,
} from "./types";

export function localDay(epochMs: number): string {
    const date = new Date(epochMs);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function ledgerMatchKey(day: string, amount: number, currency: string, income: boolean): string {
    const rounded = (Math.round(amount * 100) / 100).toFixed(2);
    return `${day}|${rounded}|${currency.trim().toUpperCase()}|${income ? "in" : "out"}`;
}

/**
 * Each Outlayr entry vouches for one Money Manager entry, so two same-price coffees need two to be skipped. When
 * fewer Outlayr entries share a key than Money Manager entries across different accounts, nothing says which one is
 * the copy, so none is skipped: a duplicate can be deleted, a dropped entry is gone.
 */
export function matchedEntryUids(snapshot: MmSnapshot, ledger: OutlayrLedgerState, fromDay: string): Set<string> {
    const held = new Map<string, number>();
    for (const entry of ledger.entries) {
        const day = localDay(entry.date);
        if (day < fromDay) {
            continue;
        }
        const key = ledgerMatchKey(day, entry.amount, entry.currency, entry.income);
        held.set(key, (held.get(key) ?? 0) + 1);
    }
    const candidates = new Map<string, MmEntry[]>();
    for (const entry of snapshot.entries) {
        const key = ledgerMatchKey(entry.day, entry.amount, entry.currency, entry.income);
        if (entry.day < fromDay || !held.has(key)) {
            continue;
        }
        const list = candidates.get(key);
        if (list == null) {
            candidates.set(key, [entry]);
        } else {
            list.push(entry);
        }
    }
    const matched = new Set<string>();
    for (const [key, entries] of candidates) {
        const count = held.get(key) ?? 0;
        const oneAccount = new Set(entries.map((entry) => entry.accountUid)).size === 1;
        if (count >= entries.length || oneAccount) {
            for (const entry of entries.slice(0, count)) {
                matched.add(entry.uid);
            }
        }
    }
    return matched;
}

function byPosition(left: { position: number; title: string }, right: { position: number; title: string }): number {
    if (left.position !== right.position) {
        return left.position - right.position;
    }
    if (left.title < right.title) {
        return -1;
    }
    if (left.title > right.title) {
        return 1;
    }
    return 0;
}

function accountGroup(account: MmAccount): "open" | "hidden" | "deleted" {
    if (account.removed) {
        return "deleted";
    }
    if (account.hidden) {
        return "hidden";
    }
    return "open";
}

function cents(amount: number): number {
    return Math.round(amount * 100);
}

function pairEntries(snapshot: MmSnapshot, accounts: ReadonlyMap<string, MmAccount>): MmTransferPair[] {
    const groups = new Map<string, MmEntry[]>();
    for (const entry of snapshot.entries) {
        if (entry.categoryUid != null || entry.note.trim() !== "" || entry.defaultAmount == null) {
            continue;
        }
        const account = entry.accountUid == null ? undefined : accounts.get(entry.accountUid);
        if (account == null || account.removed) {
            continue;
        }
        const key = `${entry.day}|${cents(entry.defaultAmount)}`;
        const list = groups.get(key);
        if (list == null) {
            groups.set(key, [entry]);
        } else {
            list.push(entry);
        }
    }
    const pairs: MmTransferPair[] = [];
    for (const group of groups.values()) {
        const expenses = group.filter((entry) => !entry.income).sort(byUid);
        const incomes = group.filter((entry) => entry.income).sort(byUid);
        const matched = maximumMatch(expenses, incomes);
        for (const expense of expenses) {
            const income = matched.get(expense.uid);
            if (income?.accountUid == null || expense.accountUid == null || expense.defaultAmount == null) {
                continue;
            }
            pairs.push({
                amount: expense.defaultAmount,
                currency: snapshot.defaultCurrency,
                day: expense.day,
                fromAccountUid: expense.accountUid,
                inUid: income.uid,
                outUid: expense.uid,
                toAccountUid: income.accountUid,
            });
        }
    }
    return pairs.sort(comparePairs);
}

function comparePairs(left: MmTransferPair, right: MmTransferPair): number {
    if (left.day < right.day) {
        return -1;
    }
    if (left.day > right.day) {
        return 1;
    }
    return byUid(left, right);
}

function byUid(left: { uid?: string; outUid?: string }, right: { uid?: string; outUid?: string }): number {
    const leftUid = left.uid ?? left.outUid ?? "";
    const rightUid = right.uid ?? right.outUid ?? "";
    if (leftUid < rightUid) {
        return -1;
    }
    if (leftUid > rightUid) {
        return 1;
    }
    return 0;
}

function maximumMatch(expenses: readonly MmEntry[], incomes: readonly MmEntry[]): Map<string, MmEntry> {
    const edges = expenses.map((expense) => {
        const indexes: number[] = [];
        for (let index = 0; index < incomes.length; index += 1) {
            if (incomes[index]?.accountUid !== expense.accountUid) {
                indexes.push(index);
            }
        }
        return indexes;
    });
    const incomeMatch = Array.from({ length: incomes.length }, () => -1);
    const visit = (expenseIndex: number, seen: boolean[]): boolean => {
        const neighbors = edges[expenseIndex] ?? [];
        for (const incomeIndex of neighbors) {
            if (seen[incomeIndex]) {
                continue;
            }
            seen[incomeIndex] = true;
            const previous = incomeMatch[incomeIndex] ?? -1;
            if (previous === -1 || visit(previous, seen)) {
                incomeMatch[incomeIndex] = expenseIndex;
                return true;
            }
        }
        return false;
    };
    for (let index = 0; index < expenses.length; index += 1) {
        visit(
            index,
            Array.from({ length: incomes.length }, () => false)
        );
    }
    const matched = new Map<string, MmEntry>();
    for (let index = 0; index < incomes.length; index += 1) {
        const expenseIndex = incomeMatch[index] ?? -1;
        const expense = expenses[expenseIndex];
        const income = incomes[index];
        if (expenseIndex >= 0 && expense != null && income != null) {
            matched.set(expense.uid, income);
        }
    }
    return matched;
}

function balanceGaps(snapshot: MmSnapshot, accounts: readonly MmAccount[]): MmBalanceGap[] {
    const gaps: MmBalanceGap[] = [];
    for (const account of accounts) {
        if (account.removed || account.storedBalance == null) {
            continue;
        }
        let computedCents = 0;
        for (const entry of snapshot.entries) {
            if (entry.accountUid !== account.uid) {
                continue;
            }
            const face = entry.accountAmount ?? (entry.currency === account.currency ? entry.amount : null);
            if (face == null) {
                continue;
            }
            computedCents += (entry.income ? 1 : -1) * cents(face);
        }
        for (const transfer of snapshot.transfers) {
            if (transfer.fromAccountUid === account.uid && transfer.fromCurrency === account.currency) {
                computedCents -= cents(transfer.fromAmount);
            }
            if (transfer.toAccountUid === account.uid && transfer.toCurrency === account.currency) {
                computedCents += cents(transfer.toAmount);
            }
        }
        const storedCents = cents(account.storedBalance);
        if (Math.abs(storedCents - computedCents) > 0) {
            gaps.push({
                accountUid: account.uid,
                computed: computedCents / 100,
                currency: account.currency,
                stored: storedCents / 100,
            });
        }
    }
    return gaps;
}

export function analyzeSnapshot(snapshot: MmSnapshot, ledger: OutlayrLedgerState): MmAnalysis {
    const accounts = new Map(snapshot.accounts.map((account) => [account.uid, account]));
    // An entry whose category Money Manager deleted lands with no category, so it counts as uncategorized.
    const liveCategories = new Set(
        snapshot.categories.filter((category) => !category.removed).map((category) => category.uid)
    );
    const entryCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();
    const categoryTotal = new Map<string, number>();
    const years = new Map<number, number>();
    let expenseCount = 0;
    let incomeCount = 0;
    let orphanedEntryCount = 0;
    let uncategorizedExpense = 0;
    let uncategorizedIncome = 0;
    const days: string[] = [];

    for (const entry of snapshot.entries) {
        if (entry.income) {
            incomeCount += 1;
        } else {
            expenseCount += 1;
        }
        if (entry.day !== "") {
            days.push(entry.day);
            const year = Number(entry.day.slice(0, 4));
            years.set(year, (years.get(year) ?? 0) + 1);
        }
        if (entry.accountUid != null) {
            entryCount.set(entry.accountUid, (entryCount.get(entry.accountUid) ?? 0) + 1);
        }
        const account = entry.accountUid == null ? undefined : accounts.get(entry.accountUid);
        if (account == null || account.removed) {
            orphanedEntryCount += 1;
        }
        if (entry.categoryUid == null || !liveCategories.has(entry.categoryUid)) {
            if (entry.income) {
                uncategorizedIncome += 1;
            } else {
                uncategorizedExpense += 1;
            }
        }
        if (entry.categoryUid != null) {
            categoryCount.set(entry.categoryUid, (categoryCount.get(entry.categoryUid) ?? 0) + 1);
            categoryTotal.set(
                entry.categoryUid,
                (categoryTotal.get(entry.categoryUid) ?? 0) + (entry.defaultAmount ?? 0)
            );
        }
    }
    for (const transfer of snapshot.transfers) {
        if (transfer.day !== "") {
            days.push(transfer.day);
        }
    }

    const sortedDays = [...days].sort();
    const firstDay = sortedDays[0] ?? null;
    const lastDay = sortedDays.at(-1) ?? null;
    const currencies = new Set<string>();
    for (const account of snapshot.accounts) {
        currencies.add(account.currency);
    }
    for (const entry of snapshot.entries) {
        currencies.add(entry.currency);
    }
    for (const transfer of snapshot.transfers) {
        currencies.add(transfer.fromCurrency);
        currencies.add(transfer.toCurrency);
    }

    let overlap: MmAnalysis["overlap"] = null;
    if (firstDay != null && lastDay != null) {
        const inside = ledger.entries
            .map((entry) => localDay(entry.date))
            .filter((day) => day >= firstDay && day <= lastDay)
            .sort();
        const [outlayrFirstDay] = inside;
        if (outlayrFirstDay != null) {
            const mmEntries = snapshot.entries.filter((entry) => entry.day >= outlayrFirstDay).length;
            const outlayrEntries = ledger.entries.filter((entry) => localDay(entry.date) >= outlayrFirstDay).length;
            overlap = {
                matches: matchedEntryUids(snapshot, ledger, outlayrFirstDay).size,
                mmEntries,
                outlayrEntries,
                outlayrFirstDay,
            };
        }
    }

    return {
        accounts: [...snapshot.accounts].sort(byPosition).map((account) => ({
            balance: account.storedBalance,
            color: nearestPaletteColor(account.mmColor),
            currency: account.currency,
            entryCount: entryCount.get(account.uid) ?? 0,
            group: accountGroup(account),
            icon: outlayrIconFor(account.mmIcon),
            suggestedKind: suggestAccountKind(account.title, account.mmIcon, account.storedBalance),
            title: account.title,
            uid: account.uid,
        })),
        balanceGaps: balanceGaps(snapshot, snapshot.accounts),
        categories: snapshot.categories
            .filter((category) => !category.removed)
            .sort(byPosition)
            .map((category) => ({
                color: nearestPaletteColor(category.mmColor),
                entryCount: categoryCount.get(category.uid) ?? 0,
                icon: outlayrIconFor(category.mmIcon),
                income: category.income,
                limit: category.limit,
                title: category.title,
                total: categoryTotal.get(category.uid) ?? 0,
                uid: category.uid,
            })),
        currencies: [...currencies].sort(),
        entryCount: snapshot.entries.length,
        expenseCount,
        firstDay,
        incomeCount,
        lastDay,
        orphanedEntryCount,
        overlap,
        perYear: [...years.entries()]
            .sort((left, right) => left[0] - right[0])
            .map(([year, count]) => ({ count, year })),
        reminderCount: snapshot.reminderCount,
        removedAccountCount: snapshot.accounts.filter((account) => account.removed).length,
        removedEntryCount: snapshot.removedEntryCount,
        transferCount: snapshot.transfers.length,
        uncategorized: {
            expense: uncategorizedExpense,
            income: uncategorizedIncome,
            pairs: pairEntries(snapshot, accounts),
        },
    };
}
