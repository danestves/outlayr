import { fromWall } from "@outlayr/backend/confect/mcpLedger";
import { cardFeeValues, keptFeeValue } from "@outlayr/money/card-fee";
import { decimalsFor } from "@outlayr/money/currency";
import { entryRow, keptCanonical } from "@outlayr/money/entry-row";
import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import * as Effect from "effect/Effect";

import { nextRow, parseAmount, ratesLookup } from "../../../lib/account-writes";
import { openAccounts } from "../../../lib/dashboard-series-ledger";
import type { Ledger } from "../../../lib/dashboard-series-ledger";
import { money } from "../../../lib/ledger";
import type { CommitRow } from "../../../lib/ledger-commit";
import { entryPush } from "./delete";

export type Doc = Ledger["books"]["transactions"][number];

export type FeeDraft = { amount: number; rate: null } | { amount: null; rate: number };

export interface EntryDraft {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    currency: string;
    date: number;
    details: string;
    fee: FeeDraft | null;
    /** Note a new card fee saves with. */
    feeNote: string;
    income: boolean;
    note: string;
    /** Absent leaves the frozen rate alone; picking one re-freezes the entry at it. */
    rate?: { custom: number | null; type: EntryRateType };
    recurringCoefficient: number;
    recurringEndDate: number | null;
    recurringType: number;
}

const PERCENT = 100;
const RATE_DECIMALS = 6;

/** "3%" is a rate and "3.72" is an amount, in `currency`. Blank or zero is no fee. */
export function parseFee(text: string, currency: string): FeeDraft | null {
    const trimmed = text.trim();
    if (trimmed.endsWith("%")) {
        const percent = parseAmount(trimmed, RATE_DECIMALS, false);
        return percent > 0 ? { amount: null, rate: roundMoney(percent / PERCENT, RATE_DECIMALS) } : null;
    }
    const amount = parseAmount(trimmed, decimalsFor(currency));
    return amount > 0 ? { amount, rate: null } : null;
}

/** The wall clock of an instant in the ledger's zone, as a `datetime-local` value. */
export const wallText = (at: number, ledger: Pick<Ledger, "offsetAt">) =>
    new Date(at + ledger.offsetAt(at)).toISOString().slice(0, 16);

/** NaN for a cleared date input. */
export function wallInstant(text: string, ledger: Pick<Ledger, "offsetAt">) {
    return text === "" ? Number.NaN : fromWall(Date.parse(`${text}:00Z`), ledger.offsetAt);
}

/** What the form holds, as typed. */
export interface EntryValues {
    accountId: string | null;
    amountText: string;
    categoryId: string | null;
    currency: string;
    /** Set once the currency no longer follows the account, which an entry already logged never does. */
    currencyByHand: boolean;
    dateText: string;
    details: string;
    feeText: string;
    income: boolean;
    note: string;
    rateText: string;
    rateType: EntryRateType;
    recurringType: number;
}

/** The entry a form rewrites, which spares what nobody touched from a round trip through its text. */
export interface EntryBase {
    doc: Doc;
    fee: Doc | undefined;
    start: EntryValues;
}

const liveFeeOf = (books: Ledger["books"], id: string) =>
    books.transactions.find((row) => row.deletedAt === null && row.feeForId === id);

const feeTextOf = (fee: Doc | undefined) => {
    if (fee === undefined) {
        return "";
    }
    return fee.feeRate == null
        ? money(fee.amount, fee.currency ?? "USD")
        : `${roundMoney(fee.feeRate * PERCENT, RATE_DECIMALS - 2)}%`;
};

export function valuesOf(ledger: Ledger, doc: Doc): EntryValues {
    const currency = doc.currency ?? ledger.currency;
    const rateType =
        doc.exchangeRateType === "custom" || doc.exchangeRateType === "eur_reference"
            ? doc.exchangeRateType
            : "official";
    return {
        accountId: doc.accountId ?? null,
        amountText: money(doc.amount, currency),
        categoryId: doc.categoryId,
        currency,
        currencyByHand: true,
        dateText: wallText(doc.date, ledger),
        details: doc.details ?? "",
        feeText: feeTextOf(liveFeeOf(ledger.books, doc.localId)),
        income: doc.income,
        note: doc.note,
        rateText: rateType === "custom" && doc.exchangeRate !== null ? String(doc.exchangeRate) : "",
        rateType,
        recurringType: doc.recurringType,
    };
}

/** A new entry on this account, or the first open one, in that account's currency. */
export function blankValues(ledger: Ledger, accountId: string | null, at: number): EntryValues {
    const accounts = openAccounts(ledger.books);
    const account = accounts.find((row) => row.localId === accountId) ?? accounts[0];
    return {
        accountId: account?.localId ?? null,
        amountText: "",
        categoryId: null,
        currency: account?.currency ?? ledger.currency,
        currencyByHand: false,
        dateText: wallText(at, ledger),
        details: "",
        feeText: "",
        income: false,
        note: "",
        rateText: "",
        rateType: "official",
        recurringType: RECURRING_TYPE.none,
    };
}

/** Log again copies the entry to now, as a one-off even when the original still repeats. */
export const logAgainValues = (ledger: Ledger, doc: Doc, at: number): EntryValues => ({
    ...valuesOf(ledger, doc),
    dateText: wallText(at, ledger),
    recurringType: RECURRING_TYPE.none,
});

/** A plan's purchase or one of its charges: their amounts and dates belong to the plan. */
export const isFinanced = (books: Ledger["books"], doc: Doc) =>
    doc.installmentId != null ||
    books.installmentPlans.some((plan) => plan.deletedAt === null && plan.transactionId === doc.localId);

export const baseOf = (ledger: Ledger, doc: Doc): EntryBase => ({
    doc,
    fee: liveFeeOf(ledger.books, doc.localId),
    start: valuesOf(ledger, doc),
});

const rateOf = (ledger: Ledger, values: EntryValues, base: EntryBase | null): EntryDraft["rate"] => {
    if (values.rateType === "custom") {
        const same = base?.start.rateType === "custom" && values.rateText === base.start.rateText;
        return {
            custom: same ? base.doc.exchangeRate : parseAmount(values.rateText, RATE_DECIMALS, false) || null,
            type: "custom",
        };
    }
    // The drawer saves as it goes, so "back to official" is judged against the row as it stands, not as it opened.
    const live = ledger.books.transactions.find((row) => row.localId === base?.doc.localId) ?? base?.doc;
    // Official is what an untouched entry already froze at, and asking for it would re-freeze a row with no type.
    return values.rateType === "official" && (live?.exchangeRateType ?? "official") === "official"
        ? undefined
        : { custom: null, type: values.rateType };
};

export function draftOf(ledger: Ledger, values: EntryValues, base: EntryBase | null, feeNote: string): EntryDraft {
    const { doc, fee, start } = base ?? {};
    const account = ledger.books.accounts.find((row) => row.localId === values.accountId);
    const sameAmount = values.amountText === start?.amountText && values.currency === start.currency;
    const savedFee =
        fee && (fee.feeRate == null ? { amount: fee.amount, rate: null } : { amount: null, rate: fee.feeRate });
    return {
        accountId: values.accountId,
        amount: sameAmount && doc ? doc.amount : parseAmount(values.amountText, decimalsFor(values.currency)),
        categoryId: values.categoryId,
        currency: values.currency,
        date: values.dateText === start?.dateText && doc ? doc.date : wallInstant(values.dateText, ledger),
        details: values.details,
        fee:
            values.feeText === start?.feeText && savedFee
                ? savedFee
                : parseFee(values.feeText, account?.currency ?? values.currency),
        feeNote,
        income: values.income,
        note: values.note,
        rate: rateOf(ledger, values, base),
        recurringCoefficient: values.recurringType === doc?.recurringType ? doc.recurringCoefficient : 1,
        recurringEndDate: values.recurringType === doc?.recurringType ? doc.recurringEndDate : null,
        recurringType: values.recurringType,
    };
}

export type EntryProblem = "amount" | "category" | "date" | "rate" | "rateMissing";

/** Why this draft cannot be saved. An entry that never had a category may stay without one. */
export function entryProblem(ledger: Ledger, draft: EntryDraft, doc: Doc | null, at: number): EntryProblem | null {
    if (!(draft.amount > 0)) {
        return "amount";
    }
    if (Number.isNaN(draft.date)) {
        return "date";
    }
    if (draft.categoryId === null && (doc === null || doc.categoryId !== null)) {
        return "category";
    }
    if (draft.rate?.type === "custom" && draft.rate.custom === null) {
        return "rate";
    }
    const { frozen, kept } = frozenOf(ledger, doc?.localId ?? "", draft, doc, at);
    // Only a phone retries an unresolved rate, so saving one from here could leave the entry worth nothing for good.
    return frozen.amountUsd === null && kept === null ? "rateMissing" : null;
}

/** The shared rules read the device's calendar, and a browser abroad must still file on the ledger's day. */
export function filedOn(offsetAt: Ledger["offsetAt"], at: number) {
    const wall = new Date(at + offsetAt(at));
    const [year, month, day] = [wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()];
    return {
        anchorDay: day,
        day: new Date(fromWall(Date.UTC(year, month, day), offsetAt)),
        month: new Date(fromWall(Date.UTC(year, month, 1), offsetAt)),
    };
}

function entryOf(ledger: Ledger, id: string, draft: EntryDraft, at: number) {
    const { books, offsetAt } = ledger;
    const category = books.categories.find((row) => row.localId === draft.categoryId);
    const recurring = draft.recurringType > 0;
    const row = Effect.runSync(
        entryRow(
            ratesLookup(books),
            id,
            {
                accountId: draft.accountId,
                amount: draft.amount,
                categoryId: draft.categoryId,
                currency: draft.currency,
                date: new Date(draft.date),
                details: draft.details,
                exchangeRate: draft.rate?.type === "custom" ? draft.rate.custom : undefined,
                exchangeRateType: draft.rate?.type,
                income: draft.income,
                note: draft.note,
                onceRecurring: recurring,
                recurringCoefficient: draft.recurringCoefficient,
                recurringEndDate: draft.recurringEndDate === null ? null : new Date(draft.recurringEndDate),
                recurringType: draft.recurringType,
            },
            { categoryName: category?.name ?? null, currency: ledger.currency, now: new Date(at) }
        )
    );
    const { anchorDay, ...filed } = filedOn(offsetAt, draft.date);
    return { ...row, ...filed, recurringAnchorDay: recurring ? anchorDay : null };
}

type Entry = ReturnType<typeof entryOf>;

function feeValuesOf(
    ledger: Ledger,
    purchase: Pick<Entry, "accountId" | "amount" | "categoryId" | "currency" | "date" | "day" | "id" | "month"> & {
        amountUsd: number | null;
    },
    draft: EntryDraft,
    existing: Doc | undefined
) {
    const account = ledger.books.accounts.find((row) => row.localId === draft.accountId);
    if (draft.fee === null || draft.income || account === undefined) {
        return null;
    }
    return Effect.runSync(
        cardFeeValues(ratesLookup(ledger.books), purchase.id, purchase, {
            ...draft.fee,
            categoryId: existing?.categoryId ?? purchase.categoryId,
            // A fee saved in another currency stays there until it moves to another card.
            currency: (existing?.accountId === account.localId ? existing.currency : null) ?? account.currency,
            note: existing?.note ?? draft.feeNote,
        })
    );
}

function frozenOf(ledger: Ledger, id: string, draft: EntryDraft, doc: Doc | null, at: number) {
    const row = entryOf(ledger, id, draft, at);
    const kept =
        doc &&
        keptCanonical(
            row,
            {
                amount: doc.amount,
                amountUsd: doc.amountUsd,
                currency: doc.currency,
                date: new Date(doc.date),
                exchangeRate: doc.exchangeRate,
                exchangeRateType: doc.exchangeRateType,
            },
            {
                exchangeRate: draft.rate?.type === "custom" ? draft.rate.custom : undefined,
                exchangeRateType: draft.rate?.type,
            }
        );
    return { frozen: { ...row, ...kept }, kept };
}

/** The rows that log a new entry, with its card fee when one is charged. */
export function createdEntry(ledger: Ledger, id: string, draft: EntryDraft, at: number): CommitRow[] {
    const row = entryOf(ledger, id, draft, at);
    const fee = feeValuesOf(ledger, row, draft, undefined);
    return fee === null
        ? [entryPush(row, at)]
        : [entryPush(row, at), entryPush({ ...fee, id: crypto.randomUUID() }, at)];
}

/**
 * The rows that rewrite an entry. Only what the form owns moves, so a logo, a photo or a payment method set on the
 * phone survives, and the frozen USD stays unless amount, currency, date or rate did change.
 */
export function editedEntry(ledger: Ledger, doc: Doc, draft: EntryDraft, at: number): CommitRow[] {
    const { frozen: row, kept } = frozenOf(ledger, doc.localId, draft, doc, at);
    const existing = liveFeeOf(ledger.books, doc.localId);
    const fee = feeValuesOf(ledger, row, draft, existing);
    const edited = nextRow(
        "transactions",
        doc,
        {
            accountId: row.accountId,
            amount: row.amount,
            amountUsd: row.amountUsd,
            categoryId: row.categoryId,
            currency: row.currency,
            date: row.date.getTime(),
            day: row.day.getTime(),
            details: row.details,
            exchangeRate: row.exchangeRate,
            exchangeRateType: row.exchangeRateType,
            income: row.income,
            month: row.month.getTime(),
            note: row.note,
            // Stays true on every back-filled charge after its schedule moved on, so a one-off draft must not clear it.
            onceRecurring: doc.onceRecurring || row.onceRecurring,
            // A charge on the 31st lands on Feb 28, and only moving it may change the day its schedule aims for.
            recurringAnchorDay:
                draft.date === doc.date && draft.recurringType === doc.recurringType
                    ? (doc.recurringAnchorDay ?? row.recurringAnchorDay)
                    : row.recurringAnchorDay,
            recurringCoefficient: row.recurringCoefficient,
            recurringEndDate: row.recurringEndDate?.getTime() ?? null,
            recurringType: row.recurringType,
        },
        at
    );
    if (fee === null) {
        return existing
            ? [edited, nextRow("transactions", existing, { accountId: existing.accountId ?? null, deletedAt: at }, at)]
            : [edited];
    }
    if (!existing) {
        return [edited, entryPush({ ...fee, id: crypto.randomUUID() }, at)];
    }
    const { accountId, amount, amountUsd, categoryId, currency, feeRate, note } = fee;
    return [
        edited,
        nextRow(
            "transactions",
            existing,
            {
                accountId,
                amount,
                amountUsd,
                categoryId,
                currency,
                date: fee.date.getTime(),
                day: fee.day.getTime(),
                feeRate,
                month: fee.month.getTime(),
                note,
                ...keptFeeValue(
                    { ...existing, currency: existing.currency, feeRate: existing.feeRate ?? null },
                    fee,
                    kept !== null
                ),
            },
            at
        ),
    ];
}
