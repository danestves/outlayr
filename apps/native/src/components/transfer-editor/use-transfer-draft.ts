import { isPerson } from "@outlayr/money/account-kind";
import { MARKET_RATE_TYPES } from "@outlayr/money/rates";
import type { MarketRateType } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import type { RateTable } from "@outlayr/money/valuation";
import { useMemo, useState } from "react";

import { useAccountBalance, useAccounts, useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { pairRateSource, usePriorCustomRate, useTransferRates } from "@/data/transfer-rates";
import type { RateSource } from "@/data/transfer-rates";
import { lastTransfer } from "@/data/transfers-core";
import type { SavedTransfer } from "@/data/transfers-core";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { pairQuotedInverse, quotePairRate, rateEntryText } from "@/domain/transaction-entry-rate";
import { marketRateFor, transferRateOptions } from "@/domain/transfer-rate-options";
import type { TransferRateChoice } from "@/domain/transfer-rate-options";
import { solveTransfer, transferGap, transferLegs } from "@/domain/transfer-reconcile";
import type { FeeSide, TransferFees, TransferLegs, TransferValues } from "@/domain/transfer-reconcile";

/** `shortfall` is signed, in `side`'s own currency: how far that side's fee overruns what reaches it. */
type TransferBlock = { kind: "fee"; shortfall: number; side: FeeSide } | { kind: "rate" };

type EnteredTransfer = Omit<TransferValues, "arrived">;

interface Units {
    from: number;
    to: number;
}

interface TopUp {
    amount: number;
    side: FeeSide;
}

const FEE_SIDES = ["source", "destination"] as const satisfies readonly FeeSide[];

const NO_GAP_FEES: Record<FeeSide, number | null> = { destination: null, source: null };

function otherSide(side: FeeSide): FeeSide {
    return side === "source" ? "destination" : "source";
}

function sideDecimals(side: FeeSide, units: Units): number {
    return side === "source" ? units.from : units.to;
}

export type FeeMode = "none" | "included" | "onTop";

interface DraftMath {
    arrived: number | null;
    block: TransferBlock | null;
    gap: number;
    /** The whole fee each side would charge to close the gap, null where that side cannot close it. */
    gapFees: Record<FeeSide, number | null>;
    legs: TransferLegs | null;
    net: number | null;
    outside: number;
}

interface CustomRate {
    exact: number | null;
    inverse: boolean;
    text: string;
}

function pairRate(
    custom: CustomRate | undefined,
    market: number | null,
    unquote: (rate: number) => number
): number | null {
    const typed = custom === undefined ? null : numpadToNumber(custom.text);
    const rate = custom?.exact ?? (typed === null ? market : unquote(typed));
    return rate !== null && Number.isFinite(rate) && rate > 0 ? rate : null;
}

function selectedRate(
    crossCurrency: boolean,
    rateType: TransferRateChoice,
    custom: number | null,
    market: number | null
): number | null {
    if (!crossCurrency) {
        return 1;
    }
    return rateType === "custom" ? custom : market;
}

function quoteOf(rateType: TransferRateChoice | null, market: MarketRateType | null, carried?: MarketRateType) {
    const type = rateType ?? carried ?? null;
    return type === "custom" ? (market ?? carried ?? null) : type;
}

function rateChoices(
    chosen: TransferRateChoice | null,
    market: MarketRateType | null,
    carried: MarketRateType | undefined,
    binanceRate: number | null
) {
    const fallback: MarketRateType = binanceRate === null ? "official" : "binance";
    const rateType = chosen ?? carried ?? fallback;
    return { quoteType: quoteOf(rateType, market, carried) ?? fallback, rateType };
}

function transferBlock(
    entered: EnteredTransfer | null,
    arrived: number | null,
    units: Units,
    reached: number | null,
    side: FeeSide
): TransferBlock | null {
    if (entered === null) {
        return { kind: "rate" };
    }
    if (arrived !== null && arrived > 0) {
        return null;
    }
    const decimals = sideDecimals(side, units);
    const affordable = reached ?? solveTransfer({ ...entered, arrived: 0 }, side, decimals);
    return affordable === null
        ? { kind: "rate" }
        : { kind: "fee", shortfall: roundMoney(affordable - entered.fees[side], decimals), side };
}

function closingFee(values: TransferValues, side: FeeSide, units: Units): number | null {
    const fee = solveTransfer(values, side, sideDecimals(side, units));
    if (fee === null || fee <= 0) {
        return null;
    }
    return transferLegs({ ...values, fees: { ...values.fees, [side]: fee } }, units.from, units.to) === null
        ? null
        : fee;
}

// A null or zero arrival means the fee takes everything reaching its side. Both refuse, or the legs would credit a
// fee as money moved.
function settle(
    typed: EnteredTransfer | null,
    pinned: number | null,
    units: Units,
    crossCurrency: boolean,
    topUp: TopUp | null,
    outsideConfirmed: boolean,
    blockSide: FeeSide
): DraftMath {
    const arrivalTopUp = topUp?.side === "destination" ? topUp.amount : 0;
    const sourceTopUp = topUp?.side === "source" ? topUp.amount : 0;
    const entered = typed === null ? null : { ...typed, sent: roundMoney(typed.sent + sourceTopUp, units.from) };
    const solved = entered === null ? null : solveTransfer({ ...entered, arrived: 0 }, "arrived", units.to);
    const net = pinned === null ? solved : roundMoney(pinned - arrivalTopUp, units.to);
    const arrived = pinned ?? (net === null ? null : roundMoney(net + arrivalTopUp, units.to));
    const values: TransferValues | null =
        entered === null || net === null || net <= 0 ? null : { ...entered, arrived: net };
    if (typed === null || arrived === null || values === null) {
        return {
            arrived,
            block:
                typed !== null && typed.sent <= 0
                    ? null
                    : transferBlock(entered, net, units, arrivalTopUp > 0 ? pinned : null, blockSide),
            gap: 0,
            gapFees: NO_GAP_FEES,
            legs: null,
            net,
            outside: 0,
        };
    }
    const gap = pinned === null ? 0 : transferGap(values, units.from, units.to);
    const outside = crossCurrency && outsideConfirmed && gap < 0 ? -gap : 0;
    return {
        arrived,
        block: null,
        gap,
        gapFees: { destination: closingFee(values, "destination", units), source: closingFee(values, "source", units) },
        legs:
            gap === 0 || (crossCurrency && gap > 0) || outside > 0 ? transferLegs(values, units.from, units.to) : null,
        net,
        outside,
    };
}

// "On top" reads only as a single fee: with a fee on each side both are included in the figures typed.
function reconcile(
    typed: Omit<EnteredTransfer, "rate"> & { rate: number | null },
    pinned: number | null,
    units: Units,
    crossCurrency: boolean,
    feeMode: FeeMode,
    outside: boolean,
    activeSide: FeeSide
): DraftMath & { gapOnTop: boolean; onTopSide: FeeSide | null; paid: number } {
    const { rate } = typed;
    const entered = rate === null ? null : { ...typed, rate };
    const charged = FEE_SIDES.filter((side) => typed.fees[side] > 0);
    const single = charged.length === 1 ? charged[0] : null;
    const blockSide = single === null || typed.fees[activeSide] > 0 ? activeSide : single;
    const asTopUp = single === null ? null : { amount: typed.fees[single], side: single };
    const topUp = feeMode === "onTop" ? asTopUp : null;
    const math = settle(entered, pinned, units, crossCurrency, topUp, outside, blockSide);
    const onTop =
        feeMode === "included" && asTopUp !== null && math.gap !== 0
            ? settle(entered, pinned, units, crossCurrency, asTopUp, outside, blockSide)
            : null;
    return {
        ...math,
        gapOnTop: onTop?.gap === 0 && onTop.legs !== null,
        onTopSide: topUp?.side ?? null,
        paid: roundMoney(typed.sent + (topUp?.side === "source" ? topUp.amount : 0), units.from),
    };
}

export interface TransferDraft {
    accounts: Account[];
    arrivalSeen: boolean;
    arrived: number | null;
    arrivedText: string;
    block: TransferBlock | null;
    canSave: boolean;
    chooseFrom: (account: Account | null) => void;
    chooseTo: (account: Account | null) => void;
    crossCurrency: boolean;
    customRatePadText: string;
    date: Date;
    /** The fee on `feeSide`, the side the fee step edits. */
    fee: number;
    feeCurrency: string;
    feeDecimals: number;
    feeMode: FeeMode;
    fees: TransferFees;
    feeSide: FeeSide;
    feeText: string;
    from: Account | null;
    fromBalance: number;
    fromBalanceAfter: number;
    fromCurrency: string;
    fromDecimals: number;
    gapAmount: number;
    gapFees: Record<FeeSide, number | null>;
    gapOnTop: boolean;
    legs: TransferLegs | null;
    marketRates: Record<TransferRateChoice, number | null>;
    /** Hands `side`'s fee to the other side, through the rate; only while the other side charges nothing. */
    moveFee: (side: FeeSide) => void;
    outside: number;
    paid: number;
    prefillArrival: () => void;
    snapshot: () => TransferDraftSnapshot;
    priorCustomRate: { date: Date; rate: number } | null;
    quotedRate: number | null;
    rateInverse: boolean;
    rateOptions: TransferRateChoice[];
    rateSources: Record<TransferRateChoice, RateSource | null>;
    rateType: TransferRateChoice;
    resolveAsFee: (side: FeeSide) => void;
    resolveAsOnTop: () => void;
    selectFeeSide: (side: FeeSide) => void;
    sent: number;
    sentText: string;
    setArrived: (text: string) => void;
    setCustomRate: (text: string, exact?: number) => void;
    setDate: (date: Date) => void;
    setFee: (text: string) => void;
    setFeeMode: (mode: FeeMode) => void;
    setOutside: (confirmed: boolean) => void;
    setRateType: (type: TransferRateChoice) => void;
    setSent: (text: string) => void;
    to: Account | null;
    toBalance: number;
    toBalanceAfter: number;
    toCurrency: string;
    toDecimals: number;
}

export interface TransferSeed {
    amount?: number;
    /** Lands on the leg holding that currency, else nowhere: a wrong-currency number is worse than an empty field. */
    currency?: string;
    date?: Date;
    fromAccountId?: string;
    /** Named but not placed: the leg opens empty rather than falling back to any account. */
    fromUnresolved?: boolean;
    toAccountId?: string;
    toUnresolved?: boolean;
}

interface Opening {
    arrivalPinned: boolean;
    arrivedText: string;
    carriedRates: Partial<Record<string, MarketRateType>>;
    customRates: Record<string, CustomRate>;
    date: Date;
    feeSide: FeeSide;
    feeTexts: Record<FeeSide, string>;
    fromId: string | null;
    outside: boolean;
    rateType: TransferRateChoice | null;
    sentText: string;
    toId: string | null;
}

export interface TransferDraftSnapshot extends Opening {
    feeMode: FeeMode;
    marketType: MarketRateType | null;
    shownPair: string | null;
}

// Only a seed may name a person, so a debt paid back last is never the next default route.
function openingState(
    accounts: readonly Account[],
    seed: TransferSeed | undefined,
    last: SavedTransfer | null
): Opening {
    const from = accounts.find((account) => account.id === seed?.fromAccountId);
    const to = accounts.find((account) => account.id === seed?.toAccountId);
    const amount = seed?.amount;
    const spokenIn = seed?.currency;
    const onSent = amount !== undefined && from !== undefined && (spokenIn === undefined || spokenIn === from.currency);
    const onArrival = amount !== undefined && !onSent && to !== undefined && spokenIn === to.currency;
    const banks = accounts.filter((account) => !isPerson(account));
    const holds = (id: string, currency: string) =>
        banks.some((account) => account.id === id && account.currency === currency);
    const route =
        last !== null && holds(last.fromAccountId, last.fromCurrency) && holds(last.toAccountId, last.toCurrency)
            ? last
            : null;
    // Never opens as an account paying itself. A leg named and missed stays empty: guessing is worse than asking.
    const leg = (routed: string | undefined, other: string | null | undefined) =>
        [routed, ...banks.map((account) => account.id)].find((id) => id !== undefined && id !== other);
    const fallbackFrom = seed?.fromUnresolved ? null : leg(route?.fromAccountId, to?.id);
    const fromId = from?.id ?? fallbackFrom ?? null;
    const fallbackTo = seed?.toUnresolved ? null : leg(route?.toAccountId, fromId);
    const toId = to?.id ?? fallbackTo ?? null;
    const onRoute = route !== null && fromId === route.fromAccountId && toId === route.toAccountId;
    return {
        arrivalPinned: onArrival,
        arrivedText: onArrival ? numberToNumpad(amount, minorUnitsFor(to.currency)) : "",
        carriedRates:
            onRoute && route.rateType !== null && route.rateType !== "custom"
                ? { [`${route.fromCurrency}/${route.toCurrency}`]: route.rateType }
                : {},
        customRates: {},
        date: seed?.date ?? new Date(),
        feeSide: "source",
        feeTexts: { destination: "", source: "" },
        fromId,
        outside: false,
        rateType: null,
        sentText: onSent ? numberToNumpad(amount, minorUnitsFor(from.currency)) : "",
        toId,
    };
}

function feeText(fee: number, currency: string): string {
    return fee > 0 ? numberToNumpad(fee, minorUnitsFor(currency)) : "";
}

function savedState(accounts: readonly Account[], saved: SavedTransfer): Opening {
    const fromCurrency = accounts.find((account) => account.id === saved.fromAccountId)?.currency;
    const toCurrency = accounts.find((account) => account.id === saved.toAccountId)?.currency;
    if (fromCurrency !== saved.fromCurrency || toCurrency !== saved.toCurrency) {
        return openingState(
            accounts,
            {
                date: saved.date,
                fromAccountId: saved.fromAccountId,
                fromUnresolved: true,
                toAccountId: saved.toAccountId,
                toUnresolved: true,
            },
            null
        );
    }
    const rateType = saved.rateType ?? "official";
    const inverse = pairQuotedInverse(saved.fromCurrency, saved.toCurrency, saved.rate);
    const { fees } = saved;
    return {
        arrivalPinned: fromCurrency !== toCurrency,
        arrivedText: numberToNumpad(saved.arrived, minorUnitsFor(toCurrency)),
        carriedRates: {},
        customRates:
            rateType === "custom" && saved.rate !== null
                ? {
                      [`${fromCurrency}/${toCurrency}`]: {
                          exact: saved.rate,
                          inverse,
                          text: rateEntryText(quotePairRate(inverse, saved.rate)),
                      },
                  }
                : {},
        date: saved.date,
        feeSide: fees.source <= 0 && fees.destination > 0 ? "destination" : "source",
        feeTexts: { destination: feeText(fees.destination, toCurrency), source: feeText(fees.source, fromCurrency) },
        fromId: saved.fromAccountId,
        outside:
            fromCurrency !== toCurrency &&
            saved.rate !== null &&
            transferGap(
                { arrived: saved.arrived, fees, rate: saved.rate, sent: saved.sent },
                minorUnitsFor(fromCurrency),
                minorUnitsFor(toCurrency)
            ) < 0,
        rateType,
        sentText: numberToNumpad(saved.sent, minorUnitsFor(fromCurrency)),
        toId: saved.toAccountId,
    };
}

function tableRatesFor(from: string, to: string, date: Date, tables: Partial<Record<MarketRateType, RateTable>>) {
    const rateIn = (table: RateTable | undefined) =>
        table === undefined ? null : marketRateFor(from, to, date, table);
    return {
        binance: rateIn(tables.binance),
        custom: null,
        eur_reference: rateIn(tables.eur_reference),
        official: rateIn(tables.official),
    } satisfies Record<TransferRateChoice, number | null>;
}

function marketRatesOf(
    quoteType: TransferRateChoice,
    table: Record<TransferRateChoice, number | null>,
    own: number | null
) {
    return {
        binance: table.binance,
        custom: null,
        eur_reference: (quoteType === "eur_reference" ? own : null) ?? table.eur_reference,
        official: (quoteType === "official" ? own : null) ?? table.official,
    } satisfies Record<TransferRateChoice, number | null>;
}

function savedQuote(
    saved: SavedTransfer | undefined,
    pair: string,
    type: TransferRateChoice,
    date: Date
): number | null {
    const same =
        saved !== undefined &&
        pair === `${saved.fromCurrency}/${saved.toCurrency}` &&
        type === saved.rateType &&
        date.getTime() === saved.date.getTime();
    return same ? saved.rate : null;
}

function restoredBy(saved: SavedTransfer | undefined, account: Account | null, nowMs: number): number {
    if (saved === undefined || account === null || saved.date.getTime() > nowMs) {
        return 0;
    }
    const sent = account.id === saved.fromAccountId && account.currency === saved.fromCurrency ? saved.sent : 0;
    const arrived = account.id === saved.toAccountId && account.currency === saved.toCurrency ? saved.arrived : 0;
    return sent - arrived;
}

function startingDraft(
    db: Database,
    accounts: readonly Account[],
    seed?: TransferSeed,
    saved?: SavedTransfer,
    restored?: TransferDraftSnapshot
): TransferDraftSnapshot {
    if (restored !== undefined) {
        return restored;
    }
    const opening = saved ? savedState(accounts, saved) : openingState(accounts, seed, lastTransfer(db));
    return {
        ...opening,
        feeMode: opening.feeTexts.source === "" && opening.feeTexts.destination === "" ? "none" : "included",
        marketType: opening.rateType === "custom" ? "official" : opening.rateType,
        shownPair: null,
    };
}

export function useTransferDraft(
    db: Database,
    seed?: TransferSeed,
    saved?: SavedTransfer,
    restored?: TransferDraftSnapshot
): TransferDraft {
    // Every account, not just banks: a saved transfer with a person still has to resolve its leg.
    const accounts = useAccounts(db);
    const banks = useBankAccounts(db);
    const [opening] = useState(() => startingDraft(db, accounts, seed, saved, restored));
    const [fromId, setFromId] = useState<string | null>(opening.fromId);
    const [toId, setToId] = useState<string | null>(opening.toId);
    const [sentText, setSentText] = useState(opening.sentText);
    const [arrivedText, setArrivedText] = useState(opening.arrivedText);
    const [arrivalPinned, setArrivalPinned] = useState(opening.arrivalPinned);
    const [shownPair, setShownPair] = useState(opening.shownPair);
    const [chosenRate, setChosenRate] = useState<TransferRateChoice | null>(opening.rateType);
    const [marketType, setMarketType] = useState(opening.marketType);
    const [customRates, setCustomRates] = useState<Record<string, CustomRate>>(opening.customRates);
    const [feeTexts, setFeeTexts] = useState(opening.feeTexts);
    const [feeMode, setFeeMode] = useState(opening.feeMode);
    const [feeSide, setFeeSide] = useState<FeeSide>(opening.feeSide);
    const [date, setDate] = useState(opening.date);
    const [outside, setOutside] = useState(opening.outside);

    const from = accounts.find((account) => account.id === fromId) ?? null;
    const to = accounts.find((account) => account.id === toId) ?? null;
    const fromCurrency = from?.currency ?? "USD";
    const toCurrency = to?.currency ?? "USD";
    const crossCurrency = fromCurrency !== toCurrency;
    const pair = `${fromCurrency}/${toCurrency}`;
    const carriedRate = opening.carriedRates[pair];
    const nowMs = useNow();
    const fromRestored = restoredBy(saved, from, nowMs);
    const toRestored = restoredBy(saved, to, nowMs);

    const fromBalance = useAccountBalance(
        db,
        {
            currency: fromCurrency,
            id: fromId ?? "",
            initialBalance: from?.initialBalance ?? 0,
        },
        nowMs
    );
    const toBalance = useAccountBalance(
        db,
        {
            currency: toCurrency,
            id: toId ?? "",
            initialBalance: to?.initialBalance ?? 0,
        },
        nowMs
    );

    const chosenQuote = quoteOf(chosenRate, marketType, carriedRate);
    const quotedTypes = useMemo(
        () =>
            MARKET_RATE_TYPES.filter(
                (type) => type === chosenQuote || transferRateOptions(fromCurrency, toCurrency).includes(type)
            ),
        [chosenQuote, fromCurrency, toCurrency]
    );
    const rateTables = useTransferRates(db, [fromCurrency, toCurrency], quotedTypes);
    const tableRates = useMemo(
        () => tableRatesFor(fromCurrency, toCurrency, date, rateTables),
        [fromCurrency, toCurrency, date, rateTables]
    );
    const { quoteType, rateType } = rateChoices(chosenRate, marketType, carriedRate, tableRates.binance);
    const tableRate = tableRates[quoteType];
    const priorCustomRate = usePriorCustomRate(db, fromCurrency, toCurrency, date);
    const ownQuote = savedQuote(saved, pair, quoteType, date);
    const marketRate = ownQuote ?? tableRate;
    const customRate = customRates[pair];
    const rateInverse = customRate?.inverse ?? pairQuotedInverse(fromCurrency, toCurrency, marketRate);
    const quote = (value: number) => quotePairRate(rateInverse, value);
    // Custom rates are keyed by pair; without this the rate list would label the market rate user-authored.
    const shownRateType = rateType === "custom" && customRate === undefined ? quoteType : rateType;
    const rate = selectedRate(crossCurrency, rateType, pairRate(customRate, marketRate, quote), marketRate);

    function setCustomRateText(text: string, exact: number | null = null) {
        setCustomRates((current) => ({
            ...current,
            [pair]: { exact, inverse: current[pair]?.inverse ?? rateInverse, text },
        }));
    }

    const fromDecimals = minorUnitsFor(fromCurrency);
    const toDecimals = minorUnitsFor(toCurrency);
    const units = { from: fromDecimals, to: toDecimals };
    const feeDecimals = sideDecimals(feeSide, units);
    const feeCurrency = feeSide === "destination" ? toCurrency : fromCurrency;

    // Re-derived per render at each side's units, so a fee whose side changes currency is re-quantized instead of
    // solved against a figure the slip no longer shows.
    const fees: TransferFees = {
        destination: roundMoney(numpadToNumber(feeTexts.destination), toDecimals),
        source: roundMoney(numpadToNumber(feeTexts.source), fromDecimals),
    };
    const fee = fees[feeSide];
    const sent = roundMoney(numpadToNumber(sentText), fromDecimals);
    const math = reconcile(
        { fees, rate, sent },
        arrivalPinned ? numpadToNumber(arrivedText) : null,
        units,
        crossCurrency,
        feeMode,
        outside,
        feeSide
    );

    const setFeeText = (side: FeeSide, text: string) => setFeeTexts((current) => ({ ...current, [side]: text }));

    // Keeps every figure while an on-top fee becomes an included one, so a second fee can join it.
    const includeOnTop = () => {
        if (math.onTopSide === "source") {
            setSentText(numberToNumpad(math.paid, fromDecimals));
        }
        if (math.onTopSide === "destination" && math.net !== null) {
            setArrivedText(numberToNumpad(math.net, toDecimals));
        }
        setFeeMode("included");
    };

    // A pinned arrival is in the destination's currency, so it survives a new source and drops only when the
    // destination changes (a swap included).
    function pick(
        nextId: string,
        otherId: string | null,
        setSelf: (id: string) => void,
        setOther: (id: string | null) => void,
        selfId: string | null,
        leg: "from" | "to"
    ) {
        const swapped = nextId === otherId;
        if (swapped) {
            setOther(selfId);
        }
        setSelf(nextId);
        if ((leg === "to" && nextId !== selfId) || swapped) {
            setArrivalPinned(false);
        }
    }

    return {
        accounts: banks,
        arrivalSeen: !crossCurrency || arrivalPinned || shownPair === pair,
        arrived: math.arrived,
        arrivedText,
        block: math.block,
        canSave: from !== null && to !== null && from.id !== to.id && sent > 0 && math.legs !== null,
        chooseFrom: (account) => {
            if (account) {
                setOutside(false);
                pick(account.id, toId, setFromId, setToId, fromId, "from");
                // Same currency on both legs: the sent side is the pinned arrival.
                if (arrivalPinned && sent === 0 && account.id !== toId && account.currency === toCurrency) {
                    setSentText(arrivedText);
                }
            }
        },
        chooseTo: (account) => {
            if (account) {
                setOutside(false);
                pick(account.id, fromId, setToId, setFromId, toId, "to");
            }
        },
        crossCurrency,
        customRatePadText: customRate?.text ?? (marketRate === null ? "" : rateEntryText(quote(marketRate))),
        date,
        fee,
        feeCurrency,
        feeDecimals,
        feeMode,
        fees,
        feeSide,
        feeText: feeTexts[feeSide],
        from,
        fromBalance: roundMoney(fromBalance.total, fromDecimals),
        fromBalanceAfter: roundMoney(fromBalance.total + fromRestored - math.paid, fromDecimals),
        fromCurrency,
        fromDecimals,
        gapAmount: math.gap,
        gapFees: math.gapFees,
        gapOnTop: math.gapOnTop,
        legs: math.legs,
        marketRates: marketRatesOf(quoteType, tableRates, ownQuote),
        moveFee: (side) => {
            const target = otherSide(side);
            if (fees[target] > 0) {
                return;
            }
            const amount = fees[side];
            const text =
                crossCurrency && rate !== null && amount > 0
                    ? numberToNumpad(
                          roundMoney(
                              target === "destination" ? amount * rate : amount / rate,
                              sideDecimals(target, units)
                          ),
                          sideDecimals(target, units)
                      )
                    : feeTexts[side];
            setFeeTexts(side === "source" ? { destination: text, source: "" } : { destination: "", source: text });
            setFeeSide(target);
        },
        outside: math.outside,
        paid: math.paid,
        prefillArrival: () => {
            setArrivedText(math.arrived === null ? "" : numberToNumpad(math.arrived, toDecimals));
            setShownPair(pair);
        },
        priorCustomRate,
        quotedRate: rate,
        rateInverse,
        rateOptions: crossCurrency ? transferRateOptions(fromCurrency, toCurrency) : [],
        rateSources: {
            binance: pairRateSource(fromCurrency, toCurrency, date, rateTables.binance),
            custom: null,
            eur_reference: pairRateSource(fromCurrency, toCurrency, date, rateTables.eur_reference),
            official: pairRateSource(fromCurrency, toCurrency, date, rateTables.official),
        },
        rateType: shownRateType,
        resolveAsFee: (side) => {
            const closing = math.gapFees[side];
            if (closing !== null && math.net !== null) {
                includeOnTop();
                setFeeText(side, numberToNumpad(closing, sideDecimals(side, units)));
                setFeeSide(side);
            }
        },
        resolveAsOnTop: () => setFeeMode("onTop"),
        selectFeeSide: setFeeSide,
        snapshot: () => ({
            arrivalPinned,
            arrivedText,
            carriedRates: opening.carriedRates,
            customRates,
            date,
            feeMode,
            feeSide,
            feeTexts,
            fromId,
            marketType,
            outside,
            rateType: chosenRate,
            sentText,
            shownPair,
            toId,
        }),
        sent,
        sentText,
        setArrived: (text) => {
            setOutside(false);
            setArrivedText(text);
            setArrivalPinned(numpadToNumber(text) > 0);
        },
        setCustomRate: (text, exact) => {
            setOutside(false);
            setCustomRateText(text, exact);
        },
        setDate: (next) => {
            setOutside(false);
            setDate(next);
        },
        setFee: (text) => {
            const charging = numpadToNumber(text) > 0;
            if (charging && math.onTopSide === otherSide(feeSide)) {
                includeOnTop();
            }
            setFeeText(feeSide, text);
            if (feeMode === "none" && charging) {
                setFeeMode("included");
            }
        },
        setFeeMode: (mode) => {
            setFeeMode(mode === "none" && fees[otherSide(feeSide)] > 0 ? "included" : mode);
            if (mode === "none") {
                setFeeText(feeSide, "");
            }
        },
        setOutside,
        setRateType: (next) => {
            setOutside(false);
            setChosenRate(next);
            if (next !== "custom") {
                setMarketType(next);
            }
        },
        setSent: (text) => {
            setOutside(false);
            setSentText(text);
        },
        to,
        toBalance: roundMoney(toBalance.total, toDecimals),
        toBalanceAfter: roundMoney(toBalance.total + toRestored + (math.net ?? 0), toDecimals),
        toCurrency,
        toDecimals,
    };
}
