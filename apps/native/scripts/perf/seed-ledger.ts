// Grows an exported archive into the perf ledger. Each entry clones a template row, so columns this script does not
// know keep what the app wrote. Dates end now in the run's zone, so pass the device's:
//   TZ=<device zone> node --import tsx scripts/perf/seed-ledger.ts --from <archive> --out <file>
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";

import { archiveRowCount, parseArchive, serializeArchive } from "../../src/domain/archive";
import type { ArchiveRow } from "../../src/domain/archive";

const DAY_MS = 86_400_000;
const SEED = 20_261_018;
const FOREIGN_SHARE = 0.15;
const INCOME_SHARE = 0.06;
const NOTES = [
    "Mercadona",
    "Starbucks",
    "Uber",
    "Amazon",
    "Spotify",
    "Lidl",
    "Repsol",
    "Zara",
    "Netflix",
    "Carrefour",
    "Glovo",
    "Renfe",
    "Apple",
    "IKEA",
    "Decathlon",
    "",
];

const { values: args } = parseArgs({
    options: {
        days: { default: "540", type: "string" },
        entries: { default: "3000", type: "string" },
        from: { type: "string" },
        out: { type: "string" },
    },
});

if (args.from === undefined || args.out === undefined) {
    throw new Error("Usage: seed-ledger.ts --from <exported archive> --out <file> [--entries N] [--days N]");
}

const template = parseArchive(readFileSync(args.from, "utf-8"));
if (template === null) {
    throw new Error(`${args.from} is not an archive this build can restore.`);
}

// mulberry32: seedable, and the same sequence on every machine.
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d_2b_79_f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
}

const roll = random(SEED);
const pick = <T>(items: readonly T[]): T => items[Math.floor(roll() * items.length)] as T;
const cents = (value: number) => Math.round(value * 100) / 100;

function uuid(): string {
    const hex = Array.from({ length: 32 }, () => Math.floor(roll() * 16).toString(16));
    hex[12] = "4";
    hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
    const s = hex.join("");
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const live = (row: ArchiveRow) => row.deletedAt === null || row.deletedAt === undefined;
const categories = template.tables.categories.filter(live);
const expenseCategories = categories.filter((row) => row.income === false);
const incomeCategories = categories.filter((row) => row.income === true);
const accounts = template.tables.accounts.filter(live);
const entries = template.tables.transactions.filter(live);
const expenseTemplates = entries.filter((row) => row.income === false);
const ledgerCurrency = template.tables.appMeta.find((row) => row.key === "currency")?.value ?? null;
const foreignTemplates = expenseTemplates.filter((row) => row.currency !== null && row.currency !== ledgerCurrency);

const base = expenseTemplates.find((row) => !foreignTemplates.includes(row));
if (base === undefined || expenseCategories.length === 0 || incomeCategories.length === 0) {
    throw new Error("The template needs one expense in the ledger currency, and expense and income categories.");
}

const count = Number(args.entries);
const days = Number(args.days);
const now = Date.now();
const today = startOfDay(new Date(now)).getTime();

const generated = Array.from({ length: count }, (): ArchiveRow => {
    const income = roll() < INCOME_SHARE;
    const foreign = !income && foreignTemplates.length > 0 && roll() < FOREIGN_SHARE;
    const source = foreign ? pick(foreignTemplates) : base;
    // Triangular, so recent days are about twice as busy as the average day.
    const daysAgo = Math.floor((1 - Math.sqrt(1 - roll())) * days);
    const at = today - daysAgo * DAY_MS + (8 + roll() * 14) * 3_600_000;
    const date = new Date(at > now ? at - DAY_MS : at);
    const amount = income ? cents(800 + roll() * 2200) : cents(2 + roll() ** 3 * 240);
    const usdPerUnit =
        typeof source.amountUsd === "number" && typeof source.amount === "number" && source.amount !== 0
            ? source.amountUsd / source.amount
            : null;
    return {
        ...source,
        accountId: accounts.length > 0 ? (pick(accounts).id ?? null) : (source.accountId ?? null),
        amount,
        amountUsd: usdPerUnit === null ? (source.amountUsd ?? null) : cents(amount * usdPerUnit),
        categoryId: (income ? pick(incomeCategories) : pick(expenseCategories)).id ?? null,
        date: date.getTime(),
        day: startOfDay(date).getTime(),
        id: uuid(),
        income,
        month: firstOfMonth(date).getTime(),
        note: income ? "" : pick(NOTES),
        updatedAt: date.getTime(),
    };
});

const document = {
    ...template,
    exportedAt: Date.now(),
    tables: { ...template.tables, transactions: [...template.tables.transactions, ...generated] },
};
const text = serializeArchive(document);
const reread = parseArchive(text);
if (reread === null || reread.tables.transactions.length !== template.tables.transactions.length + count) {
    throw new Error("The generated archive does not read back; the template or the archive format changed.");
}
writeFileSync(args.out, text);
process.stdout.write(
    `${args.out}: ${archiveRowCount(reread)} rows, ${count} generated entries over ${days} days, ` +
        `${foreignTemplates.length > 0 ? "with" : "without"} foreign-currency entries\n`
);
