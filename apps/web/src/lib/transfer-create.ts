import { isPerson } from "@outlayr/money/account-kind";
import { decimalsFor } from "@outlayr/money/currency";
import { utcDateString } from "@outlayr/money/dates";
import { zoneCalendar } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";
import { transferLegs } from "@outlayr/money/transfer-reconcile";
import { chargedFees, feeColumns, freezeTransfer, legColumns, transferRejection } from "@outlayr/money/transfer-row";
import type { TransferInput } from "@outlayr/money/transfer-row";
import * as Effect from "effect/Effect";

import { nextRow, parseAmount, ratesLookup } from "./account-writes";
import { openAccounts } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import { entryPush } from "./delete-writes";
import { wallInstant, wallText } from "./entry-writes";
import { money } from "./ledger";
import type { CommitRow } from "./ledger-committer";

type Books = Ledger["books"];

export interface NewTransferValues {
    arrivedByHand: boolean;
    arrivedText: string;
    dateText: string;
    feeText: string;
    fromId: string | null;
    note: string;
    sentText: string;
    toId: string | null;
}

export type NewTransferProblem = "accounts" | "amount" | "date" | "rateMissing" | "same-account";

export const transferAccounts = (books: Pick<Books, "accounts">) => openAccounts(books).filter((row) => !isPerson(row));

const currencyOf = (ledger: Ledger, id: string | null) =>
    ledger.books.accounts.find((row) => row.localId === id)?.currency ?? ledger.currency;

const perUsd = (books: Books, currency: string, day: string) =>
    currency === "USD" ? 1 : (Effect.runSync(ratesLookup(books)(currency, "official", day))?.rate ?? null);

export const marketRate = (ledger: Ledger, from: string, to: string, dateText: string) => {
    const at = wallInstant(dateText, ledger);
    if (Number.isNaN(at)) {
        return null;
    }
    const day = utcDateString(at);
    const [fromPerUsd, toPerUsd] = [perUsd(ledger.books, from, day), perUsd(ledger.books, to, day)];
    return fromPerUsd === null || toPerUsd === null ? null : toPerUsd / fromPerUsd;
};

const amountText = (amount: number, currency: string) => money(roundMoney(amount, decimalsFor(currency)), currency);

function arrivalOf(ledger: Ledger, values: NewTransferValues, rate: number | null) {
    const [from, to] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    const sent = parseAmount(values.sentText, decimalsFor(from));
    const fee = parseAmount(values.feeText, decimalsFor(from));
    return rate === null || !(sent > 0) ? "" : amountText((sent - fee) * rate, to);
}

export function withSent(ledger: Ledger, values: NewTransferValues, sentText: string): NewTransferValues {
    const [from, to] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    const decimals = decimalsFor(from);
    const next = { ...values, sentText };
    if (
        from === to ||
        values.arrivedByHand ||
        parseAmount(sentText, decimals) === parseAmount(values.sentText, decimals)
    ) {
        return next;
    }
    return { ...next, arrivedText: arrivalOf(ledger, next, marketRate(ledger, from, to, values.dateText)) };
}

export function withArrived(ledger: Ledger, values: NewTransferValues, arrivedText: string): NewTransferValues {
    const decimals = decimalsFor(currencyOf(ledger, values.toId));
    const typed = parseAmount(arrivedText, decimals) !== parseAmount(values.arrivedText, decimals);
    return { ...values, arrivedByHand: values.arrivedByHand || typed, arrivedText };
}

export function repriced(ledger: Ledger, values: NewTransferValues): NewTransferValues {
    const [from, to] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    if (from === to || values.arrivedByHand) {
        return values;
    }
    return { ...values, arrivedText: arrivalOf(ledger, values, marketRate(ledger, from, to, values.dateText)) };
}

export function pinnedArrival(ledger: Ledger, values: NewTransferValues, arrival: number): NewTransferValues {
    const [from, to] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    if (from === to) {
        return { ...values, arrivedText: "", sentText: amountText(arrival, from) };
    }
    const rate = marketRate(ledger, from, to, values.dateText);
    return {
        ...values,
        arrivedText: amountText(arrival, to),
        sentText: rate === null ? "" : amountText(arrival / rate, from),
    };
}

export function rewired(
    ledger: Ledger,
    values: NewTransferValues,
    fromId: string | null,
    toId: string | null
): NewTransferValues {
    const [oldFrom, oldTo] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    const moved = { ...values, arrivedByHand: false, arrivedText: "", feeText: "", fromId, toId };
    const [from, to] = [currencyOf(ledger, fromId), currencyOf(ledger, toId)];
    const oldArrival = parseAmount(oldFrom === oldTo ? values.sentText : values.arrivedText, decimalsFor(oldTo));
    if (to === oldTo && oldArrival > 0) {
        return pinnedArrival(ledger, moved, oldArrival);
    }
    if (from === oldFrom) {
        return repriced(ledger, moved);
    }
    return { ...moved, sentText: "" };
}

export const swapped = (ledger: Ledger, values: NewTransferValues): NewTransferValues => {
    const crossed = currencyOf(ledger, values.fromId) !== currencyOf(ledger, values.toId);
    return {
        ...values,
        arrivedText: crossed ? values.sentText : "",
        feeText: "",
        fromId: values.toId,
        sentText: crossed ? values.arrivedText : values.sentText,
        toId: values.fromId,
    };
};

function usualSource(books: Books, accountId: string) {
    const open = transferAccounts(books);
    const live = new Set(open.map((row) => row.localId));
    const last = books.transfers
        .filter(
            (row) =>
                row.deletedAt === null &&
                row.toAccountId === accountId &&
                row.fromAccountId !== accountId &&
                live.has(row.fromAccountId)
        )
        .reduce<Books["transfers"][number] | null>(
            (newest, row) => (newest && newest.date > row.date ? newest : row),
            null
        );
    if (last) {
        return last.fromAccountId;
    }
    const assets = open.filter((row) => row.kind === "asset" && row.localId !== accountId);
    const currency = books.accounts.find((row) => row.localId === accountId)?.currency;
    return (assets.find((row) => row.currency === currency) ?? assets[0])?.localId ?? null;
}

export function newTransferValues(
    ledger: Ledger,
    accountId: string,
    cardDue: number | null,
    at: number
): NewTransferValues {
    const { books } = ledger;
    const start = {
        arrivedByHand: false,
        arrivedText: "",
        dateText: wallText(at, ledger),
        feeText: "",
        note: "",
        sentText: "",
    };
    if (cardDue === null) {
        const other = transferAccounts(books).find((row) => row.localId !== accountId)?.localId ?? null;
        return { ...start, fromId: accountId, toId: other };
    }
    const payment = { ...start, fromId: usualSource(books, accountId), toId: accountId };
    return cardDue > 0 ? pinnedArrival(ledger, payment, cardDue) : payment;
}

export function newTransferInput(ledger: Ledger, values: NewTransferValues, feeNote = ""): TransferInput | null {
    if (values.fromId === null || values.toId === null) {
        return null;
    }
    const [fromCurrency, toCurrency] = [currencyOf(ledger, values.fromId), currencyOf(ledger, values.toId)];
    const [fromDecimals, toDecimals] = [decimalsFor(fromCurrency), decimalsFor(toCurrency)];
    const crossed = fromCurrency !== toCurrency;
    const sent = parseAmount(values.sentText, fromDecimals);
    const fee = parseAmount(values.feeText, fromDecimals);
    const arrived = crossed ? parseAmount(values.arrivedText, toDecimals) : roundMoney(sent - fee, toDecimals);
    const legs = transferLegs(
        { arrived, fees: { destination: 0, source: fee }, rate: 1, sent },
        fromDecimals,
        toDecimals
    );
    const [fromAmount, toAmount] = [legs?.fromAmount ?? 0, legs?.toAmount ?? 0];
    let exchangeRate: number | null = 1;
    if (crossed) {
        exchangeRate = fromAmount > 0 ? toAmount / fromAmount : null;
    }
    let exchangeRateType: string | null = null;
    if (crossed) {
        exchangeRateType = values.arrivedByHand ? "custom" : "official";
    }
    return {
        date: new Date(wallInstant(values.dateText, ledger)),
        exchangeRate,
        exchangeRateType,
        fees: fee > 0 ? { source: { amount: fee, note: feeNote } } : {},
        fromAccountId: values.fromId,
        fromAmount,
        fromCurrency,
        note: values.note.trim(),
        toAccountId: values.toId,
        toAmount,
        toCurrency,
    };
}

export function newTransferProblem(ledger: Ledger, values: NewTransferValues): NewTransferProblem | null {
    const input = newTransferInput(ledger, values);
    if (input === null) {
        return "accounts";
    }
    if (Number.isNaN(input.date.getTime())) {
        return "date";
    }
    const rejected = transferRejection(input);
    if (rejected === "same-account") {
        return rejected;
    }
    if (rejected !== null) {
        return "amount";
    }
    const { feesUsd, fromAmountUsd, toAmountUsd } = Effect.runSync(freezeTransfer(ratesLookup(ledger.books), input));
    const unpriced = fromAmountUsd === null || toAmountUsd === null || [...feesUsd.values()].includes(null);
    return unpriced ? "rateMissing" : null;
}

export function createdTransfer(ledger: Ledger, id: string, input: TransferInput, at: number): CommitRow[] {
    const { feesUsd, fromAmountUsd, toAmountUsd } = Effect.runSync(freezeTransfer(ratesLookup(ledger.books), input));
    const filing = { calendar: zoneCalendar(ledger.offsetAt), now: new Date(at) };
    const legs = legColumns(input, fromAmountUsd, toAmountUsd, filing);
    const moved = nextRow(
        "transfers",
        { deletedAt: null, localId: id, updatedAt: 0 },
        {
            ...legs,
            date: input.date.getTime(),
            dateCreated: at,
            day: legs.day.getTime(),
            month: legs.month.getTime(),
            updatedAt: at,
        },
        at
    );
    const fees = chargedFees(input).map(({ fee, side }) =>
        entryPush(
            {
                ...feeColumns(input, side, fee, feesUsd.get(side) ?? null, filing),
                categoryId: null,
                id: crypto.randomUUID(),
                income: false,
                transferId: id,
            },
            at
        )
    );
    return [moved, ...fees];
}
