import BetterSqlite3 from "better-sqlite3";
import { strToU8, zipSync } from "fflate";

// Real backups prefix the zip with 0x08 padding.
const PADDING = 8;

function at(year: number, month: number, day: number): string {
    return new Date(year, month - 1, day, 15, 4, 0, 0).toISOString();
}

function buildDatabase(): Uint8Array {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
        CREATE TABLE account (
            uid TEXT PRIMARY KEY,
            created TEXT,
            modified TEXT,
            title TEXT,
            icon TEXT,
            color INTEGER,
            currencyCode TEXT,
            ignoreInBalance INTEGER,
            isActive INTEGER,
            isRemoved INTEGER,
            position INTEGER,
            comment TEXT,
            isArchived INTEGER,
            isFavorite INTEGER
        );
        CREATE TABLE account_balance (uid TEXT, value INTEGER);
        CREATE TABLE category (
            uid TEXT PRIMARY KEY,
            created TEXT,
            modified TEXT,
            title TEXT,
            type TEXT,
            icon TEXT,
            color INTEGER,
            useCount INTEGER,
            lastUse TEXT,
            isRemoved INTEGER,
            limitAmount INTEGER,
            position INTEGER,
            isArchived INTEGER
        );
        CREATE TABLE "transaction" (
            uid TEXT PRIMARY KEY,
            created TEXT,
            modified TEXT,
            type TEXT,
            amountInDefaultCurrency INTEGER,
            amountInRealCurrency INTEGER,
            realCurrencyCode TEXT,
            amountInAccountCurrency INTEGER,
            accountCurrencyCode TEXT,
            date TEXT,
            comment TEXT,
            v INTEGER,
            isRemoved INTEGER
        );
        CREATE TABLE transfer (
            uid TEXT PRIMARY KEY,
            created TEXT,
            modified TEXT,
            fromAmount INTEGER,
            fromCurrencyCode TEXT,
            toAmount INTEGER,
            toCurrencyCode TEXT,
            date TEXT,
            comment TEXT,
            isRemoved INTEGER
        );
        CREATE TABLE sync_link (
            entityType TEXT,
            entityUid TEXT,
            otherType TEXT,
            otherUid TEXT,
            modified TEXT,
            isRemoved INTEGER
        );
        CREATE TABLE syncable_settings (
            uid TEXT,
            created TEXT,
            modified TEXT,
            value TEXT,
            type TEXT,
            isRemoved INTEGER
        );
        CREATE TABLE reminding (uid TEXT, isRemoved INTEGER);
    `);

    const insertAccount = sqlite.prepare(
        `INSERT INTO account (uid, created, modified, title, icon, color, currencyCode, ignoreInBalance, isActive, isRemoved, position, comment, isArchived, isFavorite)
         VALUES (@uid, @created, @modified, @title, @icon, @color, @currencyCode, 0, @isActive, @isRemoved, @position, '', 0, 0)`
    );
    const stamp = "2024-01-01T00:00:00.000Z";
    const accounts = [
        ["cash", "Cash", "cash", -65_536, 1, 0, 0],
        ["visa", "Visa", "credit_card", 255, 1, 0, 1],
        ["zinli", "Zinli", "online_wallet", null, 1, 0, 2],
        ["zinli-hidden", "Zinli", "online_wallet", null, 0, 0, 3],
        ["spare", "Spare", "safe", null, 1, 0, 4],
        ["old", "Old", "bank", null, 1, 1, 5],
        ["vault", "Vault", "safe", null, 1, 0, 6],
    ] as const;
    for (const [uid, title, icon, color, isActive, isRemoved, position] of accounts) {
        insertAccount.run({
            color,
            created: stamp,
            currencyCode: "USD",
            icon,
            isActive,
            isRemoved,
            modified: stamp,
            position,
            title,
            uid,
        });
    }

    const insertBalance = sqlite.prepare("INSERT INTO account_balance (uid, value) VALUES (?, ?)");
    for (const [uid, value] of [
        ["cash", -3600],
        ["visa", -1580],
        ["zinli", 11_000],
        ["zinli-hidden", -500],
        ["spare", 500],
        ["old", 0],
        ["vault", 0],
    ] as const) {
        insertBalance.run(uid, value);
    }

    const insertCategory = sqlite.prepare(
        `INSERT INTO category (uid, created, modified, title, type, icon, color, useCount, lastUse, isRemoved, limitAmount, position, isArchived)
         VALUES (@uid, @created, @modified, @title, @type, @icon, @color, 0, NULL, 0, @limitAmount, @position, 0)`
    );
    const categories = [
        ["mercado", "Mercado", "Expense", "products", 50_000, 0],
        ["transporte", "Transporte", "Expense", "transport", 0, 1],
        ["parking", "Parking", "Expense", "car", 0, 2],
        ["unused", "Unused", "Expense", "other", 0, 3],
        ["sueldo", "Sueldo", "Income", "salary", 0, 4],
        ["allowance", "Allowance", "Expense", "other", 10_000, 5],
    ] as const;
    for (const [uid, title, type, icon, limitAmount, position] of categories) {
        insertCategory.run({
            color: null,
            created: stamp,
            icon,
            limitAmount,
            modified: stamp,
            position,
            title,
            type,
            uid,
        });
    }

    const insertEntry = sqlite.prepare(
        `INSERT INTO "transaction" (
            uid, created, modified, type, amountInDefaultCurrency, amountInRealCurrency, realCurrencyCode,
            amountInAccountCurrency, accountCurrencyCode, date, comment, v, isRemoved
         ) VALUES (
            @uid, @created, @created, @type, @amountInDefaultCurrency, @amountInRealCurrency, @realCurrencyCode,
            @amountInAccountCurrency, @accountCurrencyCode, @date, @comment, 1, @isRemoved
         )`
    );
    const entries = [
        entry("e-mercado", "Expense", 2500, "2024-03-02", "Market", "cash", "mercado", 0),
        entry("e-parking", "Expense", 400, "2024-03-03", "Lot", "cash", "parking", 0),
        entry("e-transport", "Expense", 1500, "2024-03-04", "Bus", "visa", "transporte", 0),
        entry("e-sueldo", "Income", 10_000, "2024-03-04", "Pay", "zinli", "sueldo", 0),
        entry("e-snack", "Expense", 500, "2024-03-05", "Snack", "zinli-hidden", null, 0),
        entry("e-orphan", "Expense", 800, "2024-03-01", "Gone", "old", "mercado", 0),
        {
            account: "visa",
            accountCurrencyCode: "USD",
            amountInAccountCurrency: 2080,
            amountInDefaultCurrency: 2080,
            amountInRealCurrency: 7_648_100,
            category: "transporte",
            comment: "Trip",
            date: "2024-03-06",
            isRemoved: 0,
            realCurrencyCode: "COP",
            type: "Expense",
            uid: "e-cop",
        },
        entry("e-lone", "Expense", 700, "2024-03-11", "", "cash", null, 0),
        entry("e-pair-out", "Expense", 2000, "2024-03-10", "", "cash", null, 0),
        entry("e-pair-in", "Income", 2000, "2024-03-10", "", "visa", null, 0),
        entry("e-removed", "Expense", 100, "2024-03-02", "Gone row", "cash", null, 1),
    ];
    for (const row of entries) {
        const [year, month, day] = row.date.split("-").map(Number);
        insertEntry.run({
            accountCurrencyCode: row.accountCurrencyCode ?? "USD",
            amountInAccountCurrency: row.amountInAccountCurrency ?? row.amountInDefaultCurrency,
            amountInDefaultCurrency: row.amountInDefaultCurrency,
            amountInRealCurrency: row.amountInRealCurrency ?? null,
            comment: row.comment,
            created: at(year ?? 2024, month ?? 1, day ?? 1),
            date: row.date,
            isRemoved: row.isRemoved,
            realCurrencyCode: row.realCurrencyCode ?? null,
            type: row.type,
            uid: row.uid,
        });
    }

    const insertTransfer = sqlite.prepare(
        `INSERT INTO transfer (uid, created, modified, fromAmount, fromCurrencyCode, toAmount, toCurrencyCode, date, comment, isRemoved)
         VALUES (@uid, @created, @created, @fromAmount, 'USD', @toAmount, @toCurrencyCode, @date, '', 0)`
    );
    insertTransfer.run({
        created: at(2024, 3, 7),
        date: "2024-03-07",
        fromAmount: 3000,
        toAmount: null,
        toCurrencyCode: null,
        uid: "t-onesided",
    });
    insertTransfer.run({
        created: at(2024, 3, 8),
        date: "2024-03-08",
        fromAmount: 1000,
        toAmount: 1000,
        toCurrencyCode: "USD",
        uid: "t-move",
    });

    const insertLink = sqlite.prepare(
        `INSERT INTO sync_link (entityType, entityUid, otherType, otherUid, modified, isRemoved)
         VALUES (?, ?, ?, ?, ?, 0)`
    );
    for (const row of entries) {
        insertLink.run("Transaction", row.uid, "Account", row.account, stamp);
        if (row.category != null) {
            insertLink.run("Transaction", row.uid, "Category", row.category, stamp);
        }
    }
    insertLink.run("Transfer", "t-onesided", "FromAccount", "old", stamp);
    insertLink.run("Transfer", "t-onesided", "ToAccount", "cash", stamp);
    insertLink.run("Transfer", "t-move", "FromAccount", "cash", stamp);
    insertLink.run("Transfer", "t-move", "ToAccount", "zinli", stamp);

    sqlite
        .prepare(
            `INSERT INTO syncable_settings (uid, created, modified, value, type, isRemoved)
             VALUES ('defaultCurrencyCode', ?, ?, 'USD', 'string', 0)`
        )
        .run(stamp, stamp);

    const bytes = sqlite.serialize();
    sqlite.close();
    return bytes;
}

interface FixtureEntry {
    account: string;
    accountCurrencyCode: string | null;
    amountInAccountCurrency: number | null;
    amountInDefaultCurrency: number;
    amountInRealCurrency: number | null;
    category: string | null;
    comment: string;
    date: string;
    isRemoved: number;
    realCurrencyCode: string | null;
    type: "Expense" | "Income";
    uid: string;
}

function entry(
    uid: string,
    type: "Expense" | "Income",
    amountInDefaultCurrency: number,
    date: string,
    comment: string,
    account: string,
    category: string | null,
    isRemoved: number
): FixtureEntry {
    return {
        account,
        accountCurrencyCode: "USD",
        amountInAccountCurrency: amountInDefaultCurrency,
        amountInDefaultCurrency,
        amountInRealCurrency: null,
        category,
        comment,
        date,
        isRemoved,
        realCurrencyCode: null,
        type,
        uid,
    };
}

/** Synthetic `.mmbackup`. Tests only: never point this at a real backup. */
export function buildMoneyManagerFixture(options?: { version?: number }): Uint8Array {
    const version = options?.version ?? 1;
    const zipped = zipSync({
        "MyFinance.db": buildDatabase(),
        backup_meta: strToU8(JSON.stringify({ hash: "fixture", version })),
    });
    const bytes = new Uint8Array(PADDING + zipped.length);
    bytes.fill(0x08, 0, PADDING);
    bytes.set(zipped, PADDING);
    return bytes;
}
