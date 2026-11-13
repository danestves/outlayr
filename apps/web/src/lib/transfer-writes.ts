import { decimalsFor } from "@outlayr/money/currency";
import { zoneCalendar } from "@outlayr/money/ledger-zone";
import type { MarketRateType } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import type { FeeSide } from "@outlayr/money/transfer-reconcile";
import {
    carriedUsd,
    chargedFees,
    feeColumns,
    feeCurrency,
    feeSideOf,
    freezeTransfer,
    keptTransferFees,
    legColumns,
    transferRejection,
} from "@outlayr/money/transfer-row";
import type { TransferInput } from "@outlayr/money/transfer-row";
import * as Effect from "effect/Effect";

import { nextRow, parseAmount, ratesLookup } from "./account-writes";
import type { Ledger } from "./dashboard-series-ledger";
import { entryPush } from "./delete-writes";
import { wallInstant, wallText } from "./entry-writes";
import { money } from "./ledger";
import type { CommitRow } from "./ledger-committer";

export type TransferDoc = Ledger["books"]["transfers"][number];
type Books = Ledger["books"];
type Fee = Books["transactions"][number] & { accountId: string | null };

/** What the transfer form holds, as typed. A fee side is null when that side has no fee row. */
export interface TransferValues {
    arrivedText: string;
    dateText: string;
    feeTexts: Record<FeeSide, string | null>;
    fromId: string;
    note: string;
    rateType: string | null;
    sentText: string;
    toId: string;
}

/** The transfer as the form opened it, what "nobody touched this" is measured against across saves. */
export interface TransferBase {
    doc: TransferDoc;
    fees: Map<FeeSide, Fee>;
    start: TransferValues;
}

export type TransferProblem = "date" | "empty-leg" | "rateMissing" | "same-account";

// The shared fee rules take a null account, and a row can store it as absent.
const liveFeesOf = (books: Books, id: string) =>
    books.transactions.flatMap((row) =>
        row.deletedAt === null && row.transferId === id ? [{ ...row, accountId: row.accountId ?? null }] : []
    );

export function transferBaseOf(ledger: Ledger, doc: TransferDoc): TransferBase {
    const fees = new Map(liveFeesOf(ledger.books, doc.localId).map((fee) => [feeSideOf(doc, fee), fee]));
    const feeText = (side: FeeSide) => {
        const fee = fees.get(side);
        return fee ? money(fee.amount, fee.currency ?? ledger.currency) : null;
    };
    return {
        doc,
        fees,
        start: {
            arrivedText: money(doc.toAmount, doc.toCurrency),
            dateText: wallText(doc.date, ledger),
            feeTexts: { destination: feeText("destination"), source: feeText("source") },
            fromId: doc.fromAccountId,
            note: doc.note,
            rateType: doc.exchangeRateType ?? null,
            sentText: money(doc.fromAmount, doc.fromCurrency),
            toId: doc.toAccountId,
        },
    };
}

/** The other way round: each account keeps the money it moved and the fee it was charged. */
export const swappedTransfer = (values: TransferValues): TransferValues => ({
    ...values,
    arrivedText: values.sentText,
    feeTexts: { destination: values.feeTexts.source, source: values.feeTexts.destination },
    fromId: values.toId,
    sentText: values.arrivedText,
    toId: values.fromId,
});

/** A leg on its stored account keeps its stored currency: an account can change currency after the money moved. */
export function currencyOf(books: Books, { doc }: TransferBase, id: string) {
    if (id === doc.fromAccountId) {
        return doc.fromCurrency;
    }
    if (id === doc.toAccountId) {
        return doc.toCurrency;
    }
    return books.accounts.find((row) => row.localId === id)?.currency ?? doc.fromCurrency;
}

const isSwap = (doc: TransferDoc, fromId: string, toId: string) =>
    fromId === doc.toAccountId && toId === doc.fromAccountId;

/** The stored money each leg starts from. A swap moves it with the accounts; any other route leaves it in place. */
function storedLegs(doc: TransferDoc, fromId: string, toId: string) {
    const from = { amount: doc.fromAmount, amountUsd: doc.fromAmountUsd ?? null, currency: doc.fromCurrency };
    const to = { amount: doc.toAmount, amountUsd: doc.toAmountUsd ?? null, currency: doc.toCurrency };
    return isSwap(doc, fromId, toId) ? { from: to, to: from } : { from, to };
}

const perUsd = (books: Books, currency: string, rateType: MarketRateType, day: string) => {
    if (currency === "USD") {
        return 1;
    }
    const found = Effect.runSync(ratesLookup(books)(currency, rateType, day));
    return found && found.rate > 0 ? found.rate : null;
};

/** What one unit of `from` buys in `to` at a published rate of that day, or null when none is published. */
function marketPairRate(books: Books, from: string, to: string, rateType: MarketRateType, at: number) {
    if (Number.isNaN(at)) {
        return null;
    }
    const day = new Date(at).toISOString().slice(0, 10);
    const [fromPerUsd, toPerUsd] = [perUsd(books, from, rateType, day), perUsd(books, to, rateType, day)];
    return fromPerUsd === null || toPerUsd === null ? null : toPerUsd / fromPerUsd;
}

/** The form after its pair or rate changes: the arrival a published rate gives, or null when none is published. */
export function repriced(ledger: Ledger, base: TransferBase, values: TransferValues, rateType: MarketRateType) {
    const from = currencyOf(ledger.books, base, values.fromId);
    const to = currencyOf(ledger.books, base, values.toId);
    const rate = marketPairRate(ledger.books, from, to, rateType, wallInstant(values.dateText, ledger));
    if (rate === null) {
        return null;
    }
    const sent = parseAmount(values.sentText, decimalsFor(from));
    return { ...values, arrivedText: money(roundMoney(sent * rate, decimalsFor(to)), to), rateType };
}

const throughRate = (text: string | null, from: string, to: string, rate: number) =>
    text === null || text.trim() === "" || !Number.isFinite(rate) || rate <= 0
        ? text
        : money(roundMoney(parseAmount(text, decimalsFor(from)) * rate, decimalsFor(to)), to);

function tradedLegs(books: Books, base: TransferBase, values: TransferValues): TransferValues {
    const traded = { ...values, fromId: values.toId, toId: values.fromId };
    const [from, to] = [currencyOf(books, base, values.fromId), currencyOf(books, base, values.toId)];
    if (from === to) {
        return traded;
    }
    const rate = parseAmount(values.arrivedText, decimalsFor(to)) / parseAmount(values.sentText, decimalsFor(from));
    return {
        ...traded,
        arrivedText: values.sentText,
        feeTexts: {
            destination: throughRate(values.feeTexts.destination, to, from, 1 / rate),
            source: throughRate(values.feeTexts.source, from, to, rate),
        },
        sentText: values.arrivedText,
    };
}

/** A new account on one leg. A pair that changes currency reprices, and without a published rate it reads as typed. */
export function withAccounts(ledger: Ledger, base: TransferBase, values: TransferValues, fromId: string, toId: string) {
    const { books } = ledger;
    if (fromId === toId || (fromId === values.toId && toId === values.fromId)) {
        return tradedLegs(books, base, values);
    }
    const moved = { ...values, fromId, toId };
    const [from, to] = [currencyOf(books, base, fromId), currencyOf(books, base, toId)];
    if (from === to) {
        return { ...moved, arrivedText: money(parseAmount(values.sentText, decimalsFor(from)), to), rateType: null };
    }
    const samePair = from === currencyOf(books, base, values.fromId) && to === currencyOf(books, base, values.toId);
    if (samePair) {
        return moved;
    }
    return repriced(ledger, base, moved, "official") ?? { ...moved, rateType: "custom" };
}

/**
 * The transfer a form describes. What nobody touched keeps its stored number instead of a round trip through text,
 * and a changed crossing stores the rate its two amounts actually give.
 */
export function transferInputOf(ledger: Ledger, base: TransferBase, values: TransferValues): TransferInput {
    const { books } = ledger;
    const { doc, fees, start } = base;
    const fromCurrency = currencyOf(books, base, values.fromId);
    const toCurrency = currencyOf(books, base, values.toId);
    const samePair = fromCurrency === doc.fromCurrency && toCurrency === doc.toCurrency;
    const stored = storedLegs(doc, values.fromId, values.toId);
    const amountOf = (leg: typeof stored.from, text: string, currency: string) => {
        const typed = parseAmount(text, decimalsFor(currency));
        const same =
            leg.currency === currency && typed === parseAmount(money(leg.amount, currency), decimalsFor(currency));
        return same ? leg.amount : typed;
    };
    const fromAmount = amountOf(stored.from, values.sentText, fromCurrency);
    const toAmount = amountOf(stored.to, values.arrivedText, toCurrency);
    const crossed = fromCurrency !== toCurrency;
    const untouched =
        samePair && fromAmount === doc.fromAmount && toAmount === doc.toAmount && values.rateType === start.rateType;
    const accountOf = (side: FeeSide) => (side === "destination" ? values.toId : values.fromId);
    const feeOf = (side: FeeSide) => {
        const text = values.feeTexts[side];
        if (text === null) {
            return {};
        }
        const currency = side === "destination" ? toCurrency : fromCurrency;
        const owner = [...fees.values()].find((row) => row.accountId === accountOf(side)) ?? fees.get(side);
        const ownerCurrency = owner?.currency ?? ledger.currency;
        const same = owner && ownerCurrency === currency && text === money(owner.amount, currency);
        const amount = same ? owner.amount : parseAmount(text, decimalsFor(currency));
        return amount > 0 ? { [side]: { amount, note: owner?.note ?? "" } } : {};
    };
    return {
        date: new Date(values.dateText === start.dateText ? doc.date : wallInstant(values.dateText, ledger)),
        exchangeRate: untouched ? (doc.exchangeRate ?? null) : ratedAt(crossed, fromAmount, toAmount),
        exchangeRateType: untouched ? (doc.exchangeRateType ?? null) : rateTypeOf(crossed, values.rateType),
        fees: { ...feeOf("source"), ...feeOf("destination") },
        fromAccountId: values.fromId,
        fromAmount,
        fromCurrency,
        note: values.note,
        toAccountId: values.toId,
        toAmount,
        toCurrency,
    };
}

function ratedAt(crossed: boolean, fromAmount: number, toAmount: number) {
    if (!crossed) {
        return 1;
    }
    return fromAmount > 0 ? toAmount / fromAmount : null;
}

function rateTypeOf(crossed: boolean, rateType: string | null) {
    if (!crossed) {
        return null;
    }
    return rateType ?? "custom";
}

const frozenOf = (ledger: Ledger, doc: TransferDoc, input: TransferInput) => {
    const frozen = Effect.runSync(freezeTransfer(ratesLookup(ledger.books), input));
    const stored = storedLegs(doc, input.fromAccountId, input.toAccountId);
    const date = new Date(doc.date);
    return {
        feesUsd: frozen.feesUsd,
        fromUsd:
            carriedUsd({ ...stored.from, date }, input.fromAmount, input.fromCurrency, input.date) ??
            frozen.fromAmountUsd,
        toUsd: carriedUsd({ ...stored.to, date }, input.toAmount, input.toCurrency, input.date) ?? frozen.toAmountUsd,
    };
};

/** Each charged fee with the row it keeps and its USD: carried from that row, or frozen fresh. */
function pricedFees(ledger: Ledger, doc: TransferDoc, input: TransferInput) {
    const { feesUsd } = frozenOf(ledger, doc, input);
    const existing = liveFeesOf(ledger.books, doc.localId);
    const charged = chargedFees(input);
    // After a swap a fee's side is read from the new route, so each row stays with its own account's fee and USD.
    const kept = keptTransferFees(
        isSwap(doc, input.fromAccountId, input.toAccountId) ? { toAccountId: input.toAccountId } : doc,
        existing,
        charged
    );
    const fees = charged.map(({ fee, side }) => {
        const row = kept.get(side);
        const carried =
            row &&
            carriedUsd(
                {
                    amount: row.amount,
                    amountUsd: row.amountUsd ?? null,
                    currency: row.currency ?? null,
                    date: new Date(row.date),
                },
                fee.amount,
                feeCurrency(input, side),
                input.date
            );
        return { amountUsd: carried ?? feesUsd.get(side) ?? null, fee, row, side };
    });
    return { existing, fees };
}

/** Why this transfer cannot be saved. Only a phone retries an unresolved rate, so none may be saved from here. */
export function transferProblem(ledger: Ledger, doc: TransferDoc, input: TransferInput): TransferProblem | null {
    if (Number.isNaN(input.date.getTime())) {
        return "date";
    }
    const rejected = transferRejection(input);
    if (rejected !== null) {
        return rejected;
    }
    const { fromUsd, toUsd } = frozenOf(ledger, doc, input);
    const unpriced = pricedFees(ledger, doc, input).fees.some((fee) => fee.amountUsd === null);
    return fromUsd === null || toUsd === null || unpriced ? "rateMissing" : null;
}

/**
 * The rows that rewrite a transfer, as native's update does: one live fee per side survives with its id and frozen
 * USD, and a fee nobody charges any more is tombstoned. A plan link or anything else the form does not own stays.
 */
export function editedTransfer(ledger: Ledger, doc: TransferDoc, input: TransferInput, at: number): CommitRow[] {
    const { fromUsd, toUsd } = frozenOf(ledger, doc, input);
    const filing = { calendar: zoneCalendar(ledger.offsetAt), now: new Date(at) };
    const legs = legColumns(input, fromUsd, toUsd, filing);
    const edited = nextRow(
        "transfers",
        doc,
        {
            ...legs,
            date: legs.date.getTime(),
            day: legs.day.getTime(),
            month: legs.month.getTime(),
            updatedAt: at,
        },
        at
    );
    const { existing, fees } = pricedFees(ledger, doc, input);
    const keptIds = new Set(fees.map(({ row }) => row?.localId));
    const gone = existing
        .filter((row) => !keptIds.has(row.localId))
        .map((row) => nextRow("transactions", row, { accountId: row.accountId, deletedAt: at }, at));
    const written = fees.map(({ amountUsd, fee, row, side }) => {
        const columns = feeColumns(input, side, fee, amountUsd, filing);
        return row
            ? nextRow(
                  "transactions",
                  row,
                  {
                      accountId: columns.accountId,
                      amount: columns.amount,
                      amountUsd: columns.amountUsd,
                      currency: columns.currency,
                      date: columns.date.getTime(),
                      day: columns.day.getTime(),
                      month: columns.month.getTime(),
                      note: columns.note,
                  },
                  at
              )
            : entryPush(
                  { ...columns, categoryId: null, id: crypto.randomUUID(), income: false, transferId: doc.localId },
                  at
              );
    });
    return [edited, ...written, ...gone];
}
