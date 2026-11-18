import { addDays, startOfDay } from "@outlayr/money/calendar";
import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { SEEDED_CATEGORY_NAMES } from "@outlayr/money/category-rules";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { merchantKey } from "@outlayr/money/merchant-key";
import type { Locale } from "@outlayr/shared/i18n";

import { pickerOrder } from "../../../../native/src/domain/account-order";
import { formatSentenceDate } from "./dates";
import { ACCOUNTS, DEMO_NOW, ROWS } from "./ledger";
import type { DemoAccount, DemoRow, LogoDomain } from "./ledger";
import type { AppKey, AppT } from "./strings";

export type EntrySlot = "amount" | "merchant" | "category" | "account";
export type EntrySurface = "amountPad" | "keyboard" | "chips" | "none";
export type EntryCategory = (typeof SEEDED_CATEGORY_NAMES.expense)[number];
export type EntryAccount = DemoRow["accountId"];

export interface EntryState {
    readonly account: EntryAccount | null;
    readonly active: EntrySlot | null;
    readonly amount: string;
    readonly category: EntryCategory | null;
    readonly date: string;
    readonly name: string;
    readonly surface: EntrySurface;
}

const pad = (value: number) => String(value).padStart(2, "0");
const stamp = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const EMPTY: EntryState = {
    account: null,
    active: "amount",
    amount: "",
    category: null,
    date: stamp(DEMO_NOW),
    name: "",
    surface: "amountPad",
};
export const NUMPAD: EntryState = { ...EMPTY, amount: "42" };
export const NAME: EntryState = { ...NUMPAD, active: "merchant", surface: "keyboard" };
export const NAME_CHIPS: EntryState = { ...NAME, name: "Co" };
export const CATEGORY: EntryState = {
    ...NUMPAD,
    account: "acc-chase",
    active: "category",
    category: "Groceries",
    name: "Costco",
    surface: "chips",
};
export const ACCOUNT: EntryState = { ...CATEGORY, active: "account" };
export const FILLED: EntryState = { ...CATEGORY, active: "amount", surface: "amountPad" };

export const CATEGORY_KEYS = {
    Groceries: "categories.preset.groceries",
    "Dining Out": "categories.preset.diningOut",
    Transport: "categories.preset.transport",
    Fuel: "categories.preset.fuel",
    Rent: "categories.preset.rent",
    Home: "categories.preset.home",
    Utilities: "categories.preset.utilities",
    "Phone & Internet": "categories.preset.phoneInternet",
    Healthcare: "categories.preset.healthcare",
    Entertainment: "categories.preset.entertainment",
} as const satisfies Record<EntryCategory, AppKey>;

export const ENTRY_CATEGORIES = SEEDED_CATEGORY_NAMES.expense;

interface CatalogueMerchant {
    label: string;
    logo: LogoDomain | null;
    patterns: readonly string[];
    tags: readonly AppKey[];
}

const MERCHANTS: readonly CatalogueMerchant[] = [
    { label: "Costco", logo: "costco.com", patterns: ["costco"], tags: ["merchantTag.Warehouse"] },
    { label: "Con Edison", logo: "coned.com", patterns: ["con edison", "coned"], tags: [] },
    { label: "Xfinity", logo: null, patterns: ["comcast", "xfinity"], tags: [] },
    { label: "Cox Communications", logo: null, patterns: ["cox communications"], tags: [] },
    { label: "Copa Airlines", logo: null, patterns: ["copa airlines", "copa air"], tags: [] },
];

const MERCHANT_SUGGESTION_LIMIT = 4;
const RECENT_MERCHANT_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

function suggestMerchants(query: string, limit: number, exclude: readonly string[]): string[] {
    const key = merchantKey(query);
    if (key.length < MIN_QUERY_LENGTH) {
        return [];
    }
    const skip = new Set(exclude.map(merchantKey));
    const ranked: { label: string; length: number }[] = [];
    for (const entry of MERCHANTS) {
        const [canonical] = entry.patterns;
        if (canonical === undefined || skip.has(canonical) || !entry.patterns.some((p) => p.startsWith(key))) {
            continue;
        }
        ranked.push({ label: entry.label, length: canonical.length });
    }
    return ranked
        .toSorted((a, b) => a.length - b.length)
        .slice(0, limit)
        .map((entry) => entry.label);
}

function recentMerchants(): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of ROWS.filter((each) => !each.income).toSorted((a, b) => b.date.getTime() - a.date.getTime())) {
        const key = merchantKey(row.note);
        if (key !== "" && !seen.has(key)) {
            seen.add(key);
            names.push(row.note.trim());
        }
        if (names.length === RECENT_MERCHANT_LIMIT) {
            break;
        }
    }
    return names;
}

export function merchantNames(query: string): string[] {
    const recent = recentMerchants();
    const needle = query.trim().toLocaleLowerCase();
    const own = needle === "" ? recent : recent.filter((name) => name.toLocaleLowerCase().includes(needle));
    return [...new Set([...own, ...suggestMerchants(query, MERCHANT_SUGGESTION_LIMIT, recent)])];
}

export function merchantIdentity(name: string): CatalogueMerchant | null {
    const key = merchantKey(name);
    return key === "" ? null : (MERCHANTS.find((entry) => entry.patterns.includes(key)) ?? null);
}

const SHARED_SYMBOLS: ReadonlySet<string> = new Set(
    PICKABLE_CURRENCY_CODES.map((code) => CURRENCY_META[code].symbol).filter(
        (symbol, index, symbols) => symbols.indexOf(symbol) !== index
    )
);

export const symbolIsShared = (code: string) => SHARED_SYMBOLS.has(currencyDisplayFor(code).symbol);

export const amountOf = (state: EntryState) => {
    const value = Number(state.amount);
    return value > 0 ? value : null;
};

export const accountOf = (id: EntryAccount | null): DemoAccount | null =>
    ACCOUNTS.find((account) => account.id === id) ?? null;

export const pickerAccounts = () => pickerOrder(ACCOUNTS, false);

export function whenLabel(state: EntryState, now: Date, locale: Locale, t: AppT): string {
    const date = new Date(state.date);
    const target = startOfDay(date).getTime();
    if (target === startOfDay(now).getTime()) {
        return t("transaction.sentence.when.today");
    }
    if (target === addDays(startOfDay(now), -1).getTime()) {
        return t("transaction.sentence.when.yesterday");
    }
    return t("transaction.sentence.when.on", { date: formatSentenceDate(date, locale, t) });
}

export function stageStep(state: EntryState): EntrySlot {
    if (state.surface === "keyboard") {
        return "merchant";
    }
    return state.surface === "chips" && state.active !== null ? state.active : "amount";
}

export function footerSaves(state: EntryState): boolean {
    const answered = amountOf(state) !== null && state.category !== null;
    return answered && (state.account !== null || stageStep(state) === "account");
}

export function savedRow(state: EntryState): DemoRow | null {
    const amount = amountOf(state);
    if (amount === null || state.category === null || state.account === null) {
        return null;
    }
    return {
        accountId: state.account,
        amount,
        amountUsd: amount,
        category: state.category,
        currency: "USD",
        date: new Date(state.date),
        id: "row-entry",
        income: false,
        logo: merchantIdentity(state.name)?.logo ?? null,
        note: state.name,
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringType: 0,
        reminderLeadDays: null,
    };
}
