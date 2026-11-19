import { addDays, startOfDay } from "@outlayr/money/calendar";
import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { SEEDED_CATEGORY_NAMES } from "@outlayr/money/category-rules";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { merchantKey } from "@outlayr/money/merchant-key";
import type { Locale } from "@outlayr/shared/i18n";

import { pickerOrder } from "../../../../native/src/domain/account-order";
import { dayMonth } from "./dates";
import { DEMO_NOW } from "./ledger";
import type { DemoAccount, DemoRow, Ledger } from "./ledger";
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

const CHIP_PREFIX = 2;
const pad = (value: number) => String(value).padStart(2, "0");
const stamp = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export interface EntryStates {
    readonly ACCOUNT: EntryState;
    readonly CATEGORY: EntryState;
    readonly EMPTY: EntryState;
    readonly FILLED: EntryState;
    readonly NAME: EntryState;
    readonly NAME_CHIPS: EntryState;
    readonly NUMPAD: EntryState;
}

const STATES = new WeakMap<Ledger, EntryStates>();

function buildStates({ hero }: Ledger): EntryStates {
    const EMPTY: EntryState = {
        account: null,
        active: "amount",
        amount: "",
        category: null,
        date: stamp(DEMO_NOW),
        name: "",
        surface: "amountPad",
    };
    const NUMPAD: EntryState = { ...EMPTY, amount: String(hero.amount) };
    const NAME: EntryState = { ...NUMPAD, active: "merchant", surface: "keyboard" };
    const CATEGORY: EntryState = {
        ...NUMPAD,
        account: "acc-bank",
        active: "category",
        category: "Groceries",
        name: hero.merchant.name,
        surface: "chips",
    };
    return {
        ACCOUNT: { ...CATEGORY, active: "account" },
        CATEGORY,
        EMPTY,
        FILLED: { ...CATEGORY, active: "amount", surface: "amountPad" },
        NAME,
        NAME_CHIPS: { ...NAME, name: [...hero.merchant.name].slice(0, CHIP_PREFIX).join("") },
        NUMPAD,
    };
}

export function entryStates(ledger: Ledger): EntryStates {
    let states = STATES.get(ledger);
    if (!states) {
        states = buildStates(ledger);
        STATES.set(ledger, states);
    }
    return states;
}

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
    logo: string | null;
    patterns: readonly string[];
    tags: readonly AppKey[];
}

const CATALOGUES = new WeakMap<Ledger, readonly CatalogueMerchant[]>();

function catalogue(ledger: Ledger): readonly CatalogueMerchant[] {
    let merchants = CATALOGUES.get(ledger);
    if (!merchants) {
        const { merchant } = ledger.hero;
        const heroTag: AppKey = merchant.logo === "costco.com" ? "merchantTag.Warehouse" : "merchantTag.Groceries";
        const brands = new Map(
            ledger.rows.flatMap((row) => (row.logo === null ? [] : [[row.note, row.logo] as const]))
        );
        merchants = [...brands].map(([label, logo]) => ({
            label,
            logo,
            patterns: [merchantKey(label)],
            tags: label === merchant.name ? [heroTag] : [],
        }));
        CATALOGUES.set(ledger, merchants);
    }
    return merchants;
}

const MERCHANT_SUGGESTION_LIMIT = 4;
const RECENT_MERCHANT_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

function suggestMerchants(ledger: Ledger, query: string, limit: number, exclude: readonly string[]): string[] {
    const key = merchantKey(query);
    if (key.length < MIN_QUERY_LENGTH) {
        return [];
    }
    const skip = new Set(exclude.map(merchantKey));
    const ranked: { label: string; length: number }[] = [];
    for (const entry of catalogue(ledger)) {
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

function recentMerchants(ledger: Ledger): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of ledger.rows
        .filter((each) => !each.income)
        .toSorted((a, b) => b.date.getTime() - a.date.getTime())) {
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

export function merchantNames(ledger: Ledger, query: string): string[] {
    const recent = recentMerchants(ledger);
    const needle = query.trim().toLocaleLowerCase();
    const own = needle === "" ? recent : recent.filter((name) => name.toLocaleLowerCase().includes(needle));
    return [...new Set([...own, ...suggestMerchants(ledger, query, MERCHANT_SUGGESTION_LIMIT, recent)])];
}

export function merchantIdentity(ledger: Ledger, name: string): CatalogueMerchant | null {
    const key = merchantKey(name);
    return key === "" ? null : (catalogue(ledger).find((entry) => entry.patterns.includes(key)) ?? null);
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

export const accountOf = (ledger: Ledger, id: EntryAccount | null): DemoAccount | null =>
    ledger.accounts.find((account) => account.id === id) ?? null;

export const pickerAccounts = (ledger: Ledger) => pickerOrder(ledger.accounts, false);

export function whenLabel(state: EntryState, now: Date, locale: Locale, t: AppT): string {
    const date = new Date(state.date);
    const target = startOfDay(date).getTime();
    if (target === startOfDay(now).getTime()) {
        return t("transaction.sentence.when.today");
    }
    if (target === addDays(startOfDay(now), -1).getTime()) {
        return t("transaction.sentence.when.yesterday");
    }
    return t("transaction.sentence.when.on", { date: dayMonth(date, locale, t) });
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

export function savedRow(ledger: Ledger, state: EntryState): DemoRow | null {
    const amount = amountOf(state);
    if (amount === null || state.category === null || state.account === null) {
        return null;
    }
    return {
        accountId: state.account,
        amount,
        category: state.category,
        currency: ledger.currency,
        date: new Date(state.date),
        id: "row-entry",
        income: false,
        key: "grocery",
        logo: merchantIdentity(ledger, state.name)?.logo ?? null,
        note: state.name,
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringType: 0,
        reminderLeadDays: null,
    };
}

export function savedRows(ledger: Ledger): DemoRow[] {
    const row = savedRow(ledger, entryStates(ledger).FILLED);
    return row ? [row] : [];
}
