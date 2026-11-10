import { isPerson } from "./account-kind";
import { decimalsFor } from "./currency";
import { currencyTotals } from "./currency-totals";
import { utcDateString } from "./dates";
import { roundMoney } from "./round";
import { isExact, valueRowsIn } from "./valuation";
import type { RateTable } from "./valuation";

export interface LookSource {
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    imageKey: string | null;
}

export interface EntrySource extends LookSource {
    accountId?: string | null;
    amount: number;
    amountUsd: number | null;
    categoryId: string | null;
    currency: string | null;
    date: number;
    day: number;
    exchangeRate: number | null;
    exchangeRateType: string | null;
    feeForId?: string | null;
    income: boolean;
    localId: string;
    note: string;
    recurringType: number;
    transferId?: string | null;
}

export interface TransferSource {
    date: number;
    day: number;
    fromAccountId: string;
    fromAmount: number;
    fromCurrency: string;
    localId: string;
    note: string;
    toAccountId: string;
    toAmount: number;
    toCurrency: string;
}

export interface AccountSource extends LookSource {
    kind?: string | null;
    localId: string;
    name: string;
}

export interface CategorySource {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    name: string | null;
}

export interface Look {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    imageKey: string | null;
}

const present = (value: string | null | undefined) => (value != null && value !== "" ? value : null);

// Storage is icon XOR emoji, so the pair falls through whole, as the app's `resolveTransactionIdentity` does.
function symbolOf(icon: string | null | undefined, emoji: string | null | undefined) {
    const named = present(icon);
    if (named !== null) {
        return { emoji: null, icon: named };
    }
    const drawn = present(emoji);
    return drawn === null ? null : { emoji: drawn, icon: null };
}

export function entryLook(row: LookSource, category: CategorySource | undefined): Look {
    return {
        ...(symbolOf(row.icon, row.emoji) ?? symbolOf(category?.icon, category?.emoji) ?? { emoji: null, icon: null }),
        color: present(row.customColor) ?? present(row.imageColor) ?? present(category?.color),
        imageKey: row.imageKey,
    };
}

export function accountLook(account: Omit<AccountSource, "localId">) {
    const person = isPerson(account);
    return {
        color: person ? present(account.customColor) : (present(account.imageColor) ?? present(account.customColor)),
        emoji: person ? null : present(account.emoji),
        icon: person ? null : present(account.icon),
        imageKey: person ? null : account.imageKey,
        name: account.name,
        person,
    };
}

// A row with no currency was written in its day's ledger currency, so only its exact value says what it is now.
export function placed(row: Pick<EntrySource, "amount" | "currency">, currency: string, valued: number | null) {
    if (row.currency === null) {
        return { amount: valued ?? row.amount, currency, valued: null };
    }
    return { amount: row.amount, currency: row.currency, valued };
}

export interface Clock {
    dayOf: (row: { date: number; day: number }) => string;
    timeOf: (row: { date: number; day: number }) => string;
}

interface LogInput {
    accounts: ReadonlyMap<string, AccountSource>;
    categories: ReadonlyMap<string, CategorySource>;
    clock: Clock;
    currency: string;
    entries: readonly EntrySource[];
    /** A scan that came back full may have cut its oldest day, so that day is left out. */
    entriesFull: boolean;
    limit: number;
    rates: RateTable;
    transfers: readonly TransferSource[];
    transfersFull: boolean;
}

const valuable = (row: EntrySource) => ({
    amount: row.amount,
    amountUsd: row.amountUsd,
    currency: row.currency,
    dateKey: utcDateString(row.date),
    exchangeRate: row.exchangeRate,
    exchangeRateType: row.exchangeRateType,
    income: row.income,
});

function transferMove(transfer: TransferSource, fees: readonly EntrySource[]) {
    let source = 0;
    let destination = 0;
    const shown = fees.map((fee) => {
        const atDestination = fee.accountId === transfer.toAccountId;
        if (atDestination) {
            destination += fee.amount;
        } else {
            source += fee.amount;
        }
        return { amount: fee.amount, currency: atDestination ? transfer.toCurrency : transfer.fromCurrency };
    });
    return {
        arrived: roundMoney(transfer.toAmount - destination, decimalsFor(transfer.toCurrency)),
        fees: shown,
        sent: roundMoney(transfer.fromAmount + source, decimalsFor(transfer.fromCurrency)),
    };
}

// The backend targets ES2023, which has no `Map.groupBy`.
function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = keyOf(item);
        const group = groups.get(key);
        if (group) {
            group.push(item);
        } else {
            groups.set(key, [item]);
        }
    }
    return groups;
}

type Item =
    | { at: number; day: string; entry: EntrySource; type: "entry" }
    | { at: number; day: string; transfer: TransferSource; type: "transfer" };

export function buildLog(input: LogInput) {
    const { accounts, categories, clock, currency, entries, limit, rates, transfers } = input;
    const ids = new Set([...entries.map((row) => row.localId), ...transfers.map((row) => row.localId)]);
    const parentOf = (row: EntrySource) => {
        const parent = row.feeForId ?? row.transferId ?? null;
        return parent !== null && parent !== row.localId && ids.has(parent) ? parent : null;
    };
    const feesOf = groupBy(
        entries.filter((row) => parentOf(row) !== null),
        (row) => parentOf(row) ?? ""
    );
    const values = valueRowsIn(entries.map(valuable), currency, rates);
    const valued = new Map(
        entries.map((row, index) => [
            row.localId,
            isExact(valuable(row), currency, rates) ? (values[index] ?? null) : null,
        ])
    );
    const money = (row: EntrySource) =>
        row.currency === currency
            ? { amount: row.amount, currency, valued: null }
            : placed(row, currency, valued.get(row.localId) ?? null);

    const floors = [
        input.entriesFull ? entries.at(-1) : undefined,
        input.transfersFull ? transfers.at(-1) : undefined,
    ].flatMap((row) => (row ? [clock.dayOf(row)] : []));
    const floor = [...floors].sort().at(-1);
    const items = [
        ...entries
            .filter((row) => parentOf(row) === null)
            .map((entry): Item => ({ at: entry.date, day: clock.dayOf(entry), entry, type: "entry" })),
        ...transfers.map((transfer): Item => ({
            at: transfer.date,
            day: clock.dayOf(transfer),
            transfer,
            type: "transfer",
        })),
    ]
        .filter((item) => floor === undefined || item.day > floor)
        .sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at);
    const lastDay = items[limit - 1]?.day;
    const shown = lastDay === undefined ? items : items.filter((item, index) => index < limit || item.day === lastDay);

    const rowOf = (item: Item) => {
        if (item.type === "transfer") {
            const { transfer } = item;
            const fromAccount = accounts.get(transfer.fromAccountId);
            const toAccount = accounts.get(transfer.toAccountId);
            const move = transferMove(transfer, feesOf.get(transfer.localId) ?? []);
            return {
                arrived: move.arrived,
                arrivedCurrency: transfer.toCurrency,
                fees: move.fees,
                from: fromAccount ? accountLook(fromAccount) : null,
                id: transfer.localId,
                note: present(transfer.note) ?? `${fromAccount?.name ?? "–"} → ${toAccount?.name ?? "–"}`,
                sent: move.sent,
                sentCurrency: transfer.fromCurrency,
                time: clock.timeOf(transfer),
                to: toAccount ? accountLook(toAccount) : null,
                type: "transfer" as const,
            };
        }
        const { entry } = item;
        const category = entry.categoryId ? categories.get(entry.categoryId) : undefined;
        const [fee] = feesOf.get(entry.localId) ?? [];
        return {
            ...money(entry),
            account: entry.accountId ? (accounts.get(entry.accountId)?.name ?? null) : null,
            category: category?.name ?? null,
            fee: fee ? money(fee) : null,
            id: entry.localId,
            isFee: (entry.feeForId ?? entry.transferId ?? null) !== null,
            kind: entry.income ? ("income" as const) : ("expense" as const),
            look: entryLook(entry, category),
            note: entry.note,
            recurring: entry.recurringType > 0,
            time: clock.timeOf(entry),
            type: "entry" as const,
        };
    };

    return [...groupBy(shown, (item) => item.day)].map(([date, dayItems]) => {
        // Transfers move money between the owner's own accounts, so only entries and every fee count.
        const counted = dayItems.flatMap((item) =>
            item.type === "entry"
                ? [item.entry, ...(feesOf.get(item.entry.localId) ?? [])]
                : (feesOf.get(item.transfer.localId) ?? [])
        );
        const totals = currencyTotals(
            counted.map((row) => ({ ...row, date: new Date(row.date) })),
            currency,
            rates
        ).map((bucket) => ({ amount: bucket.amount, currency: bucket.currencyCode }));
        return { date, rows: dayItems.map(rowOf), totals };
    });
}
