import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { MmAccount, MmCategory, MmEntry, MmSnapshot, MmTransfer } from "./types";

/** Driver rows. Fields are decoded before they are read, so a caller can pass plain objects. */
export type SqlAll = (sql: string) => readonly object[];

export class MoneyManagerSnapshotError extends Schema.TaggedError<MoneyManagerSnapshotError>()(
    "MoneyManagerSnapshotError",
    {
        cause: Schema.Defect(),
        operation: Schema.Literal("read"),
        table: Schema.String,
    }
) {
    override get message(): string {
        return `Money Manager snapshot ${this.operation} failed for ${this.table}`;
    }
}

const REQUIRED = {
    account: "SELECT uid, title, icon, color, currencyCode, isActive, isRemoved, position FROM account",
    account_balance: "SELECT uid, value FROM account_balance",
    category: "SELECT uid, title, type, icon, color, isRemoved, limitAmount, position FROM category",
    sync_link: "SELECT entityType, entityUid, otherType, otherUid FROM sync_link WHERE IFNULL(isRemoved, 0) = 0",
    syncable_settings:
        "SELECT value FROM syncable_settings WHERE uid = 'defaultCurrencyCode' AND IFNULL(isRemoved, 0) = 0 LIMIT 1",
    transaction: `SELECT uid, created, type, amountInDefaultCurrency, amountInRealCurrency, realCurrencyCode,
        amountInAccountCurrency, accountCurrencyCode, date, comment, isRemoved FROM "transaction"`,
    transfer: `SELECT uid, created, fromAmount, fromCurrencyCode, toAmount, toCurrencyCode, date, comment, isRemoved
        FROM transfer`,
} as const;

const sqliteCell = Schema.Union([Schema.String, Schema.Number, Schema.BigInt, Schema.Null]);
const decodeRow = Schema.decodeUnknownOption(Schema.Record(Schema.String, sqliteCell));
const isNumber = Schema.is(Schema.Number);
const isBigint = Schema.is(Schema.BigInt);
const isString = Schema.is(Schema.String);

type SqliteCell = string | number | bigint | null | undefined;
type SqliteRows = ReturnType<typeof readTable>;

function readTable(all: SqlAll, table: string, sql: string) {
    try {
        const rows = all(sql);
        if (!Array.isArray(rows)) {
            throw new TypeError(`${table} did not return rows`);
        }
        const decoded = [];
        for (const row of rows) {
            const parsed = decodeRow(row);
            if (Option.isNone(parsed)) {
                throw new Error(`${table} row was not a Money Manager row`);
            }
            decoded.push(parsed.value);
        }
        return decoded;
    } catch (cause) {
        throw new MoneyManagerSnapshotError({ cause, operation: "read", table });
    }
}

function text(value: SqliteCell): string {
    if (value == null) {
        return "";
    }
    if (isString(value)) {
        return value;
    }
    return String(value);
}

function numberOrNull(value: SqliteCell): number | null {
    if (value == null) {
        return null;
    }
    if (isNumber(value)) {
        return Number.isFinite(value) ? value : null;
    }
    if (isBigint(value)) {
        return Number(value);
    }
    if (value.trim() === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function removed(value: SqliteCell): boolean {
    if (value == null) {
        return false;
    }
    return Number(value) !== 0;
}

function hidden(value: SqliteCell): boolean {
    if (value == null) {
        return false;
    }
    return Number(value) === 0;
}

// Money Manager stores every currency in hundredths, including COP.
function major(minor: number): number {
    return minor / 100;
}

function majorOrNull(value: SqliteCell): number | null {
    const minor = numberOrNull(value);
    return minor == null ? null : major(minor);
}

function epoch(value: SqliteCell): number {
    if (isNumber(value) && Number.isFinite(value)) {
        return value;
    }
    if (isString(value)) {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return 0;
}

function dayOf(value: SqliteCell): string {
    if (!isString(value)) {
        return "";
    }
    return /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())?.[1] ?? "";
}

function argbToHex(value: SqliteCell): string | null {
    const color = numberOrNull(value);
    if (color == null) {
        return null;
    }
    const unsigned = color < 0 ? color + 2 ** 32 : color;
    const rgb = unsigned % 0x1_00_00_00;
    const red = Math.floor(rgb / 65_536) % 256;
    const green = Math.floor(rgb / 256) % 256;
    const blue = rgb % 256;
    return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function code(value: SqliteCell, fallback: string): string {
    const trimmed = text(value).trim().toUpperCase();
    return trimmed === "" ? fallback : trimmed;
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

function iconName(value: SqliteCell): string | null {
    const trimmed = text(value).trim();
    return trimmed === "" ? null : trimmed;
}

function readAccounts(accountRows: SqliteRows, balanceRows: SqliteRows, defaultCurrency: string): MmAccount[] {
    const balances = new Map<string, number | null>();
    for (const row of balanceRows) {
        balances.set(text(row.uid), majorOrNull(row.value));
    }
    return accountRows
        .map((row) => {
            const uid = text(row.uid);
            const stored = balances.get(uid);
            return {
                currency: code(row.currencyCode, defaultCurrency),
                hidden: hidden(row.isActive),
                mmColor: argbToHex(row.color),
                mmIcon: iconName(row.icon),
                position: numberOrNull(row.position) ?? 0,
                removed: removed(row.isRemoved),
                storedBalance: balances.has(uid) ? (stored ?? null) : null,
                title: text(row.title),
                uid,
            } satisfies MmAccount;
        })
        .sort(byPosition);
}

function readCategories(categoryRows: SqliteRows): MmCategory[] {
    return categoryRows
        .map((row) => {
            const limitMinor = numberOrNull(row.limitAmount);
            return {
                income: text(row.type) === "Income",
                limit: limitMinor == null || limitMinor === 0 ? null : major(limitMinor),
                mmColor: argbToHex(row.color),
                mmIcon: iconName(row.icon),
                position: numberOrNull(row.position) ?? 0,
                removed: removed(row.isRemoved),
                title: text(row.title),
                uid: text(row.uid),
            } satisfies MmCategory;
        })
        .sort(byPosition);
}

function readLinks(linkRows: SqliteRows) {
    const accountOfEntry = new Map<string, string>();
    const categoryOfEntry = new Map<string, string>();
    const fromOfTransfer = new Map<string, string>();
    const toOfTransfer = new Map<string, string>();
    for (const link of linkRows) {
        const entityUid = text(link.entityUid);
        const otherUid = text(link.otherUid);
        const entityType = text(link.entityType);
        const otherType = text(link.otherType);
        if (entityType === "Transaction" && otherType === "Account" && !accountOfEntry.has(entityUid)) {
            accountOfEntry.set(entityUid, otherUid);
        } else if (entityType === "Transaction" && otherType === "Category" && !categoryOfEntry.has(entityUid)) {
            categoryOfEntry.set(entityUid, otherUid);
        } else if (entityType === "Transfer" && otherType === "FromAccount" && !fromOfTransfer.has(entityUid)) {
            fromOfTransfer.set(entityUid, otherUid);
        } else if (entityType === "Transfer" && otherType === "ToAccount" && !toOfTransfer.has(entityUid)) {
            toOfTransfer.set(entityUid, otherUid);
        }
    }
    return { accountOfEntry, categoryOfEntry, fromOfTransfer, toOfTransfer };
}

function readEntries(
    entryRows: SqliteRows,
    links: ReturnType<typeof readLinks>,
    accountByUid: ReadonlyMap<string, MmAccount>,
    defaultCurrency: string
) {
    let removedEntryCount = 0;
    const entries: MmEntry[] = [];
    for (const row of entryRows) {
        if (removed(row.isRemoved)) {
            removedEntryCount += 1;
            continue;
        }
        const uid = text(row.uid);
        const accountUid = links.accountOfEntry.get(uid) ?? null;
        const account = accountUid == null ? undefined : accountByUid.get(accountUid);
        const realMinor = numberOrNull(row.amountInRealCurrency);
        const accountMinor = numberOrNull(row.amountInAccountCurrency);
        const realCode = text(row.realCurrencyCode).trim().toUpperCase();
        const accountCode = text(row.accountCurrencyCode).trim().toUpperCase();
        const currency = realCode || accountCode || account?.currency || defaultCurrency;
        const accountCurrency = account?.currency ?? "";
        let accountAmount = accountMinor == null ? null : major(accountMinor);
        if (accountAmount == null && realMinor != null && realCode !== "" && realCode === accountCurrency) {
            accountAmount = major(realMinor);
        }
        entries.push({
            accountAmount,
            accountUid,
            amount: major(realMinor ?? accountMinor ?? 0),
            categoryUid: links.categoryOfEntry.get(uid) ?? null,
            createdAt: epoch(row.created),
            currency,
            day: dayOf(row.date),
            defaultAmount: majorOrNull(row.amountInDefaultCurrency),
            income: text(row.type) === "Income",
            note: text(row.comment).trim(),
            uid,
        });
    }
    return { entries, removedEntryCount };
}

function readTransfers(
    transferRows: SqliteRows,
    links: ReturnType<typeof readLinks>,
    defaultCurrency: string
): MmTransfer[] {
    const transfers: MmTransfer[] = [];
    for (const row of transferRows) {
        if (removed(row.isRemoved)) {
            continue;
        }
        const fromAmount = major(numberOrNull(row.fromAmount) ?? 0);
        const fromCurrency = code(row.fromCurrencyCode, defaultCurrency);
        transfers.push({
            createdAt: epoch(row.created),
            day: dayOf(row.date),
            fromAccountUid: links.fromOfTransfer.get(text(row.uid)) ?? null,
            fromAmount,
            fromCurrency,
            note: text(row.comment).trim(),
            toAccountUid: links.toOfTransfer.get(text(row.uid)) ?? null,
            toAmount: majorOrNull(row.toAmount) ?? fromAmount,
            toCurrency: code(row.toCurrencyCode, fromCurrency),
            uid: text(row.uid),
        });
    }
    return transfers;
}

function readReminderCount(all: SqlAll): number {
    try {
        const rows = readTable(all, "reminding", "SELECT COUNT(*) AS n FROM reminding WHERE IFNULL(isRemoved, 0) = 0");
        const [row] = rows;
        return numberOrNull(row?.n) ?? 0;
    } catch {
        return 0;
    }
}

export function readMoneyManagerSnapshot(all: SqlAll, version = 1): MmSnapshot {
    const accountRows = readTable(all, "account", REQUIRED.account);
    const balanceRows = readTable(all, "account_balance", REQUIRED.account_balance);
    const categoryRows = readTable(all, "category", REQUIRED.category);
    const entryRows = readTable(all, "transaction", REQUIRED.transaction);
    const transferRows = readTable(all, "transfer", REQUIRED.transfer);
    const linkRows = readTable(all, "sync_link", REQUIRED.sync_link);
    const settingRows = readTable(all, "syncable_settings", REQUIRED.syncable_settings);
    const [setting] = settingRows;
    const defaultCurrency = code(setting?.value, "USD");
    const accounts = readAccounts(accountRows, balanceRows, defaultCurrency);
    const accountByUid = new Map(accounts.map((account) => [account.uid, account]));
    const links = readLinks(linkRows);
    const { entries, removedEntryCount } = readEntries(entryRows, links, accountByUid, defaultCurrency);
    return {
        accounts,
        categories: readCategories(categoryRows),
        defaultCurrency,
        entries,
        reminderCount: readReminderCount(all),
        removedEntryCount,
        transfers: readTransfers(transferRows, links, defaultCurrency),
        version,
    };
}
