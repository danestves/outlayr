import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { Account } from "@/data/accounts-core";
import type { SavedTransfer } from "@/data/transfers-core";
import type { Database } from "@/db/client";

import { useTransferDraft } from "./use-transfer-draft";
import type { TransferDraft } from "./use-transfer-draft";

const mockAccounts = [
    { currency: "USD", id: "usd", initialBalance: 0, name: "Zinli" } as Account,
    { currency: "VES", id: "ves", initialBalance: 0, name: "Banesco" } as Account,
    { currency: "EUR", id: "eur", initialBalance: 0, name: "Wise" } as Account,
    { currency: "USD", id: "usd-2", initialBalance: 0, name: "Mercantil" } as Account,
    { currency: "IDR", id: "idr", initialBalance: 0, name: "BCA" } as Account,
    { currency: "SGD", id: "sgd", initialBalance: 0, name: "DBS" } as Account,
    { currency: "JPY", id: "jpy", initialBalance: 0, name: "Rakuten" } as Account,
    { currency: "KWD", id: "kwd", initialBalance: 0, name: "NBK" } as Account,
    { currency: "MXN", id: "mxn", initialBalance: 0, name: "BBVA" } as Account,
];

const mockRates = new Map<string, number>();
const mockBinanceRates = new Map<string, number>();
const mockBalances = new Map<string, number>();
const mockLastTransfer = jest.fn<() => SavedTransfer | null>(() => null);
const mockNowMs = Date.UTC(2026, 9, 1);

jest.mock("@/data/accounts", () => ({
    useAccountBalance: (_db: unknown, account: { id: string }) => ({ total: mockBalances.get(account.id) ?? 0 }),
    useAccounts: () => mockAccounts,
    useBankAccounts: () => mockAccounts,
}));

jest.mock("@/data/use-now", () => ({
    useNow: () => mockNowMs,
}));

jest.mock("@/data/transfers-core", () => ({
    lastTransfer: () => mockLastTransfer(),
}));

jest.mock("@/data/transfer-rates", () => ({
    pairRateSource: () => null,
    usePriorCustomRate: () => null,
    useTransferRates: (_db: unknown, _codes: unknown, rateTypes: readonly string[]) =>
        Object.fromEntries(
            rateTypes.map((rateType) => [
                rateType,
                {
                    get: (code: string) =>
                        new Map([
                            ["binance", mockBinanceRates],
                            ["official", mockRates],
                        ])
                            .get(rateType)
                            ?.get(code) ?? null,
                },
            ])
        ),
}));

const SENT = "1000";
const PINNED_ARRIVAL = "33333.33";
const TYPED_RATE = "30";
const OFFICIAL_VES_PER_USD = 55.5;

beforeEach(() => {
    mockRates.clear();
    mockBinanceRates.clear();
    mockBalances.clear();
    mockLastTransfer.mockReset();
    mockLastTransfer.mockReturnValue(null);
});

async function draft(): Promise<{ current: TransferDraft }> {
    const { result } = await renderHook(() => useTransferDraft({} as Database));
    return result;
}

async function overpaidDraft(): Promise<{ current: TransferDraft }> {
    const result = await draft();
    await act(async () => {
        result.current.setRateType("custom");
    });
    await act(async () => {
        result.current.setCustomRate(TYPED_RATE);
    });
    await act(async () => {
        result.current.setSent(SENT);
    });
    await act(async () => {
        result.current.setArrived(PINNED_ARRIVAL);
    });
    return result;
}

/** $10 at the official 55,50 arrives as Bs 555, and the bank takes exactly all of it. */
async function feeEatsArrivalDraft(): Promise<{ current: TransferDraft }> {
    const result = await draft();
    await act(async () => {
        result.current.setSent("10");
    });
    await act(async () => {
        result.current.toggleFeeSide();
    });
    await act(async () => {
        result.current.setFee("555");
    });
    return result;
}

/** $10 at the official 55,50 arrives as Bs 555, and the bank takes Bs 600 of it. */
async function feeOverArrivalDraft(): Promise<{ current: TransferDraft }> {
    const result = await draft();
    await act(async () => {
        result.current.setSent("10");
    });
    await act(async () => {
        result.current.toggleFeeSide();
    });
    await act(async () => {
        result.current.setFee("600");
    });
    return result;
}

async function customRateDraft(): Promise<{ current: TransferDraft }> {
    const result = await draft();
    await act(async () => {
        result.current.setRateType("custom");
    });
    await act(async () => {
        result.current.setCustomRate("600");
    });
    await act(async () => {
        result.current.setSent("100");
    });
    return result;
}

describe("an arrival above everything the typed rate converts", () => {
    it("has no fee that could explain it, and holds the save until the user says where the rest came from", async () => {
        const result = await overpaidDraft();
        expect(result.current).toMatchObject({
            canSave: false,
            gapAmount: -111.11,
            gapFee: null,
            legs: null,
            outside: 0,
        });
    });

    it("saves both legs as they happened at the typed rate once the rest came from another account", async () => {
        const result = await overpaidDraft();
        await act(async () => {
            result.current.setOutside(true);
        });
        expect(result.current).toMatchObject({
            canSave: true,
            legs: { fromAmount: 1000, toAmount: 33_333.33 },
            outside: 111.11,
            quotedRate: 30,
        });
    });

    it("asks again once the arrival it confirmed is typed over", async () => {
        const result = await overpaidDraft();
        await act(async () => {
            result.current.setOutside(true);
        });
        await act(async () => {
            result.current.setArrived("333333.3");
        });
        expect(result.current).toMatchObject({ canSave: false, outside: 0 });
    });

    it("holds the save again when the user takes it back", async () => {
        const result = await overpaidDraft();
        await act(async () => {
            result.current.setOutside(true);
        });
        await act(async () => {
            result.current.setOutside(false);
        });
        expect(result.current).toMatchObject({ canSave: false, outside: 0 });
    });
});

describe("a fee larger than what reaches the other side", () => {
    beforeEach(() => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
    });

    it("claims no arrival and names what the fee overshoots by", async () => {
        const result = await feeOverArrivalDraft();
        expect(result.current.arrived).toBeNull();
        expect(result.current.block).toStrictEqual({ kind: "fee", shortfall: -45 });
    });

    it("keeps the official rate it was quoted at instead of one the fee implies", async () => {
        const result = await feeOverArrivalDraft();
        expect(result.current.quotedRate).toBe(OFFICIAL_VES_PER_USD);
    });

    it("names the shortfall in the sender's own currency when the sender charges it", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setSent("10");
        });
        await act(async () => {
            result.current.setFee("600");
        });
        expect(result.current.feeCurrency).toBe("USD");
        expect(result.current.block).toStrictEqual({ kind: "fee", shortfall: -590 });
    });

    it("saves again once the fee fits inside the arrival", async () => {
        const result = await feeOverArrivalDraft();
        await act(async () => {
            result.current.setFee("55");
        });
        expect(result.current.arrived).toBe(500);
        expect(result.current.legs).toStrictEqual({ fromAmount: 10, toAmount: 555 });
        expect(result.current.block).toBeNull();
        expect(result.current.canSave).toBe(true);
    });
});

describe("a fee that outruns what arrives", () => {
    beforeEach(() => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
    });

    it("refuses a transfer whose fee takes every last unit that arrives", async () => {
        const result = await feeEatsArrivalDraft();

        expect(result.current.canSave).toBe(false);
        expect(result.current.legs).toBeNull();
        expect(result.current.block).not.toBeNull();
    });

    it("refuses rather than deriving a rate that makes the fee fit", async () => {
        const result = await feeOverArrivalDraft();

        expect(result.current.legs).toBeNull();
        expect(result.current.canSave).toBe(false);
        expect(result.current.block).toStrictEqual({ kind: "fee", shortfall: -45 });
    });
});

describe("a pair no rate table covers", () => {
    it("has no rate to offer, and will not invent one", async () => {
        const result = await feeOverArrivalDraft();

        expect(result.current.quotedRate).toBeNull();
        expect(result.current.legs).toBeNull();
        expect(result.current.canSave).toBe(false);
        expect(result.current.block).toStrictEqual({ kind: "rate" });
    });
});

describe("moving a fee to the other side", () => {
    beforeEach(() => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
    });

    it("carries the fee through the rate instead of relabelling its digits", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setSent("10");
        });
        await act(async () => {
            result.current.setFee("2");
        });
        await act(async () => {
            result.current.toggleFeeSide();
        });
        expect(result.current.feeCurrency).toBe("VES");
        expect(result.current.fee).toBe(2 * OFFICIAL_VES_PER_USD);
    });
});

describe("swapping a transfer that carries a custom rate", () => {
    beforeEach(() => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
    });

    it("values the inverted pair at its own rate, never at the one typed for the other", async () => {
        const result = await customRateDraft();
        await act(async () => {
            result.current.chooseFrom(result.current.to);
        });
        expect(result.current.legs).toStrictEqual({ fromAmount: 100, toAmount: 1.8 });
        expect(result.current.quotedRate).toBeCloseTo(1 / OFFICIAL_VES_PER_USD, 12);
        expect(result.current.customRatePadText).toBe("55.5");
    });

    it("stays empty once the rate is deleted, rather than refilling with the market's", async () => {
        const result = await customRateDraft();
        await act(async () => {
            result.current.setCustomRate("");
        });
        expect(result.current.customRatePadText).toBe("");
        expect(result.current.rateType).toBe("custom");
        expect(result.current.canSave).toBe(false);
    });

    it("gives the rate back to the pair it was typed for", async () => {
        const result = await customRateDraft();
        await act(async () => {
            result.current.chooseFrom(result.current.to);
        });
        await act(async () => {
            result.current.chooseFrom(result.current.to);
        });
        expect(result.current.customRatePadText).toBe("600");
        expect(result.current.quotedRate).toBe(600);
    });
});

describe("a draft taken off one editor", () => {
    beforeEach(() => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
    });

    it("opens another exactly where it was left", async () => {
        const before = await customRateDraft();
        await act(async () => {
            before.current.setFee("2");
        });
        await act(async () => {
            before.current.toggleFeeSide();
        });
        const snapshot = before.current.snapshot();

        const { result: after } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, undefined, snapshot)
        );

        expect(after.current.snapshot()).toStrictEqual(snapshot);
        expect(after.current).toMatchObject({
            customRatePadText: "600",
            fee: before.current.fee,
            feeSide: "destination",
            legs: before.current.legs,
            rateType: "custom",
        });
    });
});

describe("choosing my rate before typing one", () => {
    it("stays on the quoted source until a rate is typed", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await draft();
        await act(async () => {
            result.current.setRateType("custom");
        });
        expect(result.current.rateType).toBe("official");

        await act(async () => {
            result.current.setCustomRate(TYPED_RATE);
        });
        expect(result.current.rateType).toBe("custom");
    });
});

describe("a transfer between two currencies quoted the same way", () => {
    beforeEach(() => {
        mockRates.set("IDR", 16_300);
        mockRates.set("SGD", 1.3);
    });

    it("types rupiah per Singapore dollar and keeps reading it that way once the market rate is gone", async () => {
        const result = await draft();
        await act(async () => {
            result.current.chooseFrom(mockAccounts[4] ?? null);
        });
        await act(async () => {
            result.current.chooseTo(mockAccounts[5] ?? null);
        });
        expect(result.current.customRatePadText).toBe("12538.4615");
        await act(async () => {
            result.current.setRateType("custom");
        });
        await act(async () => {
            result.current.setCustomRate("12500");
        });
        await act(async () => {
            result.current.setSent("1250000");
        });
        mockRates.clear();
        await act(async () => {
            result.current.setDate(new Date(Date.UTC(2026, 0, 1)));
        });
        expect(result.current.rateInverse).toBe(true);
        expect(result.current).toMatchObject({ legs: { fromAmount: 1_250_000, toAmount: 100 }, quotedRate: 0.00008 });
    });
});

describe("useTransferDraft seed", () => {
    it("lands the amount on the leg whose currency it was spoken in, and nowhere when neither matches", async () => {
        const seededSent = await renderHook(() =>
            useTransferDraft({} as Database, { amount: 100, currency: "EUR", fromAccountId: "eur", toAccountId: "usd" })
        );
        expect(seededSent.result.current.sentText).toBe("100");
        expect(seededSent.result.current.arrivedText).toBe("");

        const seededArrival = await renderHook(() =>
            useTransferDraft({} as Database, { amount: 100, currency: "USD", fromAccountId: "eur", toAccountId: "usd" })
        );
        expect(seededArrival.result.current.sentText).toBe("");
        expect(seededArrival.result.current.arrivedText).toBe("100");
        expect(seededArrival.result.current.arrived).toBe(100);

        const seededNeither = await renderHook(() =>
            useTransferDraft({} as Database, { amount: 100, currency: "GBP", fromAccountId: "eur", toAccountId: "usd" })
        );
        expect(seededNeither.result.current.sentText).toBe("");
        expect(seededNeither.result.current.arrivedText).toBe("");
    });

    it("fills the leg the seed left open with an account other than the resolved one", async () => {
        const onlyFrom = await renderHook(() => useTransferDraft({} as Database, { fromAccountId: "usd" }));
        expect(onlyFrom.result.current.from?.id).toBe("usd");
        expect(onlyFrom.result.current.to?.id).toBe("ves");

        const onlyTo = await renderHook(() => useTransferDraft({} as Database, { toAccountId: "usd" }));
        expect(onlyTo.result.current.to?.id).toBe("usd");
        expect(onlyTo.result.current.from?.id).toBe("ves");
    });

    it("keeps a pinned arrival when the source is chosen afterwards, and drops it when the destination changes", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { amount: 100, currency: "USD", fromUnresolved: true, toAccountId: "usd" })
        );
        expect(result.current.from).toBeNull();
        expect(result.current.arrivedText).toBe("100");
        await act(async () => {
            result.current.chooseFrom(mockAccounts[1] ?? null);
        });
        expect(result.current.from?.id).toBe("ves");
        expect(result.current.arrivedText).toBe("100");
        expect(result.current.arrived).toBe(100);
        await act(async () => {
            result.current.chooseTo(mockAccounts[0] ?? null);
        });
        expect(result.current.arrived).toBe(100);
        await act(async () => {
            result.current.chooseTo(mockAccounts[2] ?? null);
        });
        expect(result.current.to?.id).toBe("eur");
        expect(result.current.arrived).not.toBe(100);
    });

    it("fills the sent side from a pinned arrival when the chosen source shares the destination's currency", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { amount: 100, currency: "USD", fromUnresolved: true, toAccountId: "usd" })
        );
        expect(result.current.canSave).toBeFalsy();
        await act(async () => {
            result.current.chooseFrom(mockAccounts[3] ?? null);
        });
        expect(result.current.from?.id).toBe("usd-2");
        expect(result.current.sentText).toBe("100");
        expect(result.current.arrived).toBe(100);
        expect(result.current.canSave).toBeTruthy();
    });

    it("leaves a leg empty when it was named but could not be placed", async () => {
        const missedSource = await renderHook(() =>
            useTransferDraft({} as Database, { fromUnresolved: true, toAccountId: "usd" })
        );
        expect(missedSource.result.current.from).toBeNull();
        expect(missedSource.result.current.to?.id).toBe("usd");
        expect(missedSource.result.current.canSave).toBeFalsy();

        const missedDestination = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "usd", toUnresolved: true })
        );
        expect(missedDestination.result.current.from?.id).toBe("usd");
        expect(missedDestination.result.current.to).toBeNull();
    });
});

describe("a new transfer after the last one", () => {
    const last: SavedTransfer = {
        arrived: 157_471.66,
        date: new Date(Date.UTC(2026, 8, 22)),
        fee: 7.34,
        feeSide: "destination",
        fromAccountId: "usd-2",
        fromCurrency: "USD",
        id: "last",
        note: "",
        rate: 984.1979,
        rateType: "official",
        sent: 160,
        toAccountId: "ves",
        toCurrency: "VES",
    };

    beforeEach(() => {
        mockRates.set("VES", 36.5);
        mockBinanceRates.set("VES", 1031.52);
    });

    it("opens on its pair and market rate, with the fee on the sender and every figure empty", async () => {
        mockLastTransfer.mockReturnValue(last);
        const result = await draft();
        expect(result.current).toMatchObject({
            arrivedText: "",
            feeSide: "source",
            feeText: "",
            from: { id: "usd-2" },
            quotedRate: 36.5,
            rateType: "official",
            sentText: "",
            to: { id: "ves" },
        });
    });

    it("leaves a custom rate behind and opens on the day's Binance rate", async () => {
        mockLastTransfer.mockReturnValue({ ...last, rateType: "custom" });
        const result = await draft();
        expect(result.current).toMatchObject({ from: { id: "usd-2" }, quotedRate: 1031.52, rateType: "binance" });
    });

    it("drops its rate source once a leg leaves its pair", async () => {
        mockLastTransfer.mockReturnValue({ ...last, toAccountId: "eur", toCurrency: "EUR" });
        const result = await draft();
        expect(result.current).toMatchObject({ rateType: "official", to: { id: "eur" } });
        await act(async () => {
            result.current.chooseTo(mockAccounts[1] ?? null);
        });
        expect(result.current).toMatchObject({ quotedRate: 1031.52, rateType: "binance", to: { id: "ves" } });
    });

    it.each([
        ["an account that is gone", { toAccountId: "gone" }],
        ["an account in another currency now", { fromCurrency: "EUR" }],
    ])("opens on the first two accounts when its route has %s", async (_case, change) => {
        mockLastTransfer.mockReturnValue({ ...last, ...change });
        const result = await draft();
        expect(result.current).toMatchObject({
            feeSide: "source",
            from: { id: "usd" },
            rateType: "binance",
            to: { id: "ves" },
        });
    });

    it("gives way to a seeded leg and keeps the other", async () => {
        mockLastTransfer.mockReturnValue(last);
        const { result } = await renderHook(() => useTransferDraft({} as Database, { fromAccountId: "eur" }));
        expect(result.current).toMatchObject({ feeSide: "source", from: { id: "eur" }, to: { id: "ves" } });

        const missed = await renderHook(() => useTransferDraft({} as Database, { fromUnresolved: true }));
        expect(missed.result.current.from).toBeNull();
        expect(missed.result.current.to?.id).toBe("ves");
    });
});

describe("a transfer from bolívares into dollars", () => {
    it("takes the rate as bolívares per dollar, the way it is quoted", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "ves", toAccountId: "usd" })
        );
        await act(async () => {
            result.current.setRateType("custom");
        });
        await act(async () => {
            result.current.setCustomRate("848.5");
        });
        await act(async () => {
            result.current.setSent("16970");
        });

        expect(result.current.arrived).toBe(20);
    });

    it("reopens a custom rate at full precision instead of four decimals of its inverse", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                arrived: 20,
                date: new Date(Date.UTC(2026, 7, 9)),
                fee: 0,
                feeSide: "source",
                fromAccountId: "ves",
                fromCurrency: "VES",
                id: "transfer",
                note: "",
                rate: 20 / 16_970,
                rateType: "custom",
                sent: 16_970,
                toAccountId: "usd",
                toCurrency: "USD",
            })
        );

        expect(result.current.customRatePadText).toBe("848.5");
    });
});

describe("reopening a saved transfer", () => {
    const saved: SavedTransfer = {
        arrived: 5550,
        date: new Date(Date.UTC(2026, 7, 9)),
        fee: 2.7,
        feeSide: "source",
        fromAccountId: "usd",
        fromCurrency: "USD",
        id: "transfer",
        note: "",
        rate: OFFICIAL_VES_PER_USD,
        rateType: "official",
        sent: 102.7,
        toAccountId: "ves",
        toCurrency: "VES",
    };

    async function reopened(transfer: SavedTransfer): Promise<{ current: TransferDraft }> {
        const { result } = await renderHook(() => useTransferDraft({} as Database, undefined, transfer));
        return result;
    }

    it("saves the same legs and fee when nothing is touched", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await reopened(saved);

        expect(result.current).toMatchObject({
            canSave: true,
            fee: 2.7,
            feeSide: "source",
            gapAmount: 0,
            legs: { fromAmount: 100, toAmount: 5550 },
            rateType: "official",
        });
    });

    it("reopens a custom rate and a destination fee as they were", async () => {
        const result = await reopened({
            ...saved,
            arrived: 5850,
            fee: 150,
            feeSide: "destination",
            rate: 60,
            rateType: "custom",
            sent: 100,
        });

        expect(result.current).toMatchObject({
            feeCurrency: "VES",
            gapAmount: 0,
            legs: { fromAmount: 100, toAmount: 6000 },
            quotedRate: 60,
            rateType: "custom",
        });
    });

    it("reopens at the rate it was saved with, and no gap, after the day's rate moves", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await reopened({ ...saved, arrived: 5540, rate: 55.4 });

        expect(result.current).toMatchObject({
            canSave: true,
            gapAmount: 0,
            legs: { fromAmount: 100, toAmount: 5540 },
            quotedRate: 55.4,
        });
    });

    it("moves the arrival with a new amount when both accounts hold the same currency", async () => {
        const result = await reopened({
            ...saved,
            arrived: 95,
            fee: 5,
            rate: null,
            rateType: null,
            sent: 100,
            toAccountId: "usd-2",
            toCurrency: "USD",
        });

        await act(async () => {
            result.current.setSent("150");
        });

        expect(result.current).toMatchObject({ arrived: 145, canSave: true, gapAmount: 0 });
    });

    it("stops quoting its own rate once the rate source changes", async () => {
        const result = await reopened(saved);

        await act(async () => {
            result.current.setRateType("eur_reference");
        });

        expect(result.current).toMatchObject({ block: { kind: "rate" }, canSave: false, quotedRate: null });
    });

    it("asks for the amounts again when an account's currency changed since", async () => {
        mockBalances.set("usd", 500);
        const result = await reopened({ ...saved, fromCurrency: "EUR" });

        expect(result.current).toMatchObject({ canSave: false, fee: 0, fromBalanceAfter: 500, sent: 0, sentText: "" });
    });

    it("leaves a leg empty rather than moving it to another account when its account is gone", async () => {
        const result = await reopened({ ...saved, toAccountId: "gone" });

        expect(result.current.from?.id).toBe("usd");
        expect(result.current.to).toBeNull();
    });

    it("previews each balance with the transfer being edited taken back out", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        mockBalances.set("usd", 897.3);
        mockBalances.set("ves", 5550);
        const result = await reopened(saved);

        expect(result.current).toMatchObject({
            fromBalance: 897.3,
            fromBalanceAfter: 897.3,
            toBalance: 5550,
            toBalanceAfter: 5550,
        });

        await act(async () => {
            result.current.setSent("110");
        });
        await act(async () => {
            result.current.setArrived("5500");
        });

        expect(result.current).toMatchObject({ fromBalanceAfter: 890, toBalanceAfter: 5500 });
    });

    it("previews a transfer dated after now against balances that have not counted it yet", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        mockBalances.set("usd", 1000);
        mockBalances.set("ves", 0);
        const result = await reopened({ ...saved, date: new Date(Date.UTC(2026, 9, 2)) });

        expect(result.current).toMatchObject({
            fromBalance: 1000,
            fromBalanceAfter: 897.3,
            toBalance: 0,
            toBalanceAfter: 5550,
        });
    });
});

async function pinnedDraft(sent: string, arrived: string): Promise<{ current: TransferDraft }> {
    const result = await draft();
    await act(async () => {
        result.current.setSent(sent);
    });
    await act(async () => {
        result.current.setArrived(arrived);
    });
    return result;
}

describe("dollars from Payoneer that arrive as bolívares through Binance", () => {
    beforeEach(() => {
        mockRates.set("VES", 36.5);
        mockBinanceRates.set("VES", 1031.52);
    });

    it("opens on the Binance rate of the day", async () => {
        const result = await draft();
        expect(result.current).toMatchObject({ quotedRate: 1031.52, rateType: "binance" });
        expect(result.current.rateOptions).toStrictEqual(["official", "eur_reference", "binance", "custom"]);
    });

    it("opens on the official rate when Binance has nothing for the day", async () => {
        mockBinanceRates.clear();
        const result = await draft();
        expect(result.current).toMatchObject({ quotedRate: 36.5, rateType: "official" });
    });

    it("names the dollars lost on the way, in dollars", async () => {
        const result = await pinnedDraft("160", "157471.66");
        expect(result.current).toMatchObject({ feeCurrency: "USD", gapAmount: 7.34, gapFee: 7.34 });
    });

    it("books the loss as a fee on the sender and leaves nothing unexplained", async () => {
        const result = await pinnedDraft("160", "157471.66");
        await act(async () => {
            result.current.resolveAsFee();
        });
        expect(result.current).toMatchObject({
            fee: 7.34,
            feeSide: "source",
            gapAmount: 0,
            legs: { fromAmount: 152.66, toAmount: 157_471.66 },
            rateType: "binance",
        });
    });

    async function binanceP2p(): Promise<{ current: TransferDraft }> {
        const result = await draft();
        await act(async () => {
            result.current.setRateType("custom");
        });
        await act(async () => {
            result.current.setCustomRate("957.1");
        });
        await act(async () => {
            result.current.setSent("160");
        });
        await act(async () => {
            result.current.setArrived("157471.66");
        });
        return result;
    }

    it("reads USDT already in Binance as a surplus no fee explains", async () => {
        const result = await binanceP2p();
        expect(result.current).toMatchObject({ canSave: false, gapAmount: -4.53, gapFee: null, quotedRate: 957.1 });
    });

    it("grows what came from Binance as the fee Payoneer took is typed", async () => {
        const result = await binanceP2p();
        await act(async () => {
            result.current.setOutside(true);
        });
        expect(result.current.outside).toBe(4.53);
        await act(async () => {
            result.current.setFee("7.34");
        });
        expect(result.current).toMatchObject({
            canSave: true,
            legs: { fromAmount: 152.66, toAmount: 157_471.66 },
            outside: 11.87,
            quotedRate: 957.1,
        });
    });

    it("reopens with what came from another account still confirmed", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                arrived: 157_471.66,
                date: new Date(Date.UTC(2026, 8, 30)),
                fee: 7.34,
                feeSide: "source",
                fromAccountId: "usd",
                fromCurrency: "USD",
                id: "transfer",
                note: "",
                rate: 957.1,
                rateType: "custom",
                sent: 160,
                toAccountId: "ves",
                toCurrency: "VES",
            })
        );
        expect(result.current).toMatchObject({
            canSave: true,
            legs: { fromAmount: 152.66, toAmount: 157_471.66 },
            outside: 11.87,
            quotedRate: 957.1,
        });
    });

    it("offers no fee that would swallow everything sent", async () => {
        const result = await pinnedDraft("160", "1");
        expect(result.current).toMatchObject({ gapAmount: 160, gapFee: null });
    });

    it("reopens a transfer saved at the official rate on the official rate", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                arrived: 5840,
                date: new Date(Date.UTC(2026, 8, 29)),
                fee: 0,
                feeSide: "source",
                fromAccountId: "usd",
                fromCurrency: "USD",
                id: "transfer",
                note: "",
                rate: 36.5,
                rateType: "official",
                sent: 160,
                toAccountId: "ves",
                toCurrency: "VES",
            })
        );
        expect(result.current).toMatchObject({ gapAmount: 0, quotedRate: 36.5, rateType: "official" });
    });

    it("starts a typed rate from the Binance figure", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setRateType("custom");
        });
        expect(result.current.customRatePadText).toBe("1031.52");
    });

    it("reopens a transfer saved at the Binance rate with no gap", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                arrived: 157_471.66,
                date: new Date(Date.UTC(2026, 8, 29)),
                fee: 7.34,
                feeSide: "source",
                fromAccountId: "usd",
                fromCurrency: "USD",
                id: "transfer",
                note: "",
                rate: 157_471.66 / 152.66,
                rateType: "custom",
                sent: 160,
                toAccountId: "ves",
                toCurrency: "VES",
            })
        );
        expect(result.current).toMatchObject({
            fee: 7.34,
            gapAmount: 0,
            legs: { fromAmount: 152.66, toAmount: 157_471.66 },
            rateType: "custom",
        });
    });
});

describe("a gap measured on the side that carries the fee", () => {
    it("keeps a fee moved to the receiver there, in bolívares", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await draft();
        await act(async () => {
            result.current.toggleFeeSide();
        });
        await act(async () => {
            result.current.setSent("100");
        });
        await act(async () => {
            result.current.setArrived("5400");
        });
        expect(result.current).toMatchObject({ feeCurrency: "VES", gapAmount: 150 });
        await act(async () => {
            result.current.resolveAsFee();
        });
        expect(result.current).toMatchObject({
            fee: 150,
            feeSide: "destination",
            gapAmount: 0,
            legs: { fromAmount: 100, toAmount: 5550 },
        });
    });

    it("counts yen with no decimals and closes on a whole-yen fee", async () => {
        mockRates.set("JPY", 147.23);
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "jpy", toAccountId: "usd" })
        );
        await act(async () => {
            result.current.setSent("25000");
        });
        await act(async () => {
            result.current.setArrived("160");
        });
        expect(result.current).toMatchObject({ feeCurrency: "JPY", gapAmount: 1443 });
        await act(async () => {
            result.current.resolveAsFee();
        });
        expect(result.current).toMatchObject({ fee: 1443, gapAmount: 0, legs: { fromAmount: 23_557, toAmount: 160 } });
    });

    it("counts dinars to the fils and closes on a three-decimal fee", async () => {
        mockRates.set("KWD", 0.3071);
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "usd", toAccountId: "kwd" })
        );
        await act(async () => {
            result.current.toggleFeeSide();
        });
        await act(async () => {
            result.current.setSent("1000");
        });
        await act(async () => {
            result.current.setArrived("300.123");
        });
        expect(result.current).toMatchObject({ feeCurrency: "KWD", gapAmount: 6.977 });
        await act(async () => {
            result.current.resolveAsFee();
        });
        expect(result.current).toMatchObject({ fee: 6.977, gapAmount: 0, legs: { toAmount: 307.1 } });
    });

    it("names a real loss behind a typed rate that rounds to the same four decimals", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "usd", toAccountId: "kwd" })
        );
        await act(async () => {
            result.current.setRateType("custom");
        });
        await act(async () => {
            result.current.setCustomRate("0.307");
        });
        await act(async () => {
            result.current.setSent("100000");
        });
        await act(async () => {
            result.current.setArrived("30698.5");
        });
        expect(result.current).toMatchObject({ gapAmount: 4.89, gapFee: 4.89 });
    });

    it("reopens bolívares to dollars at the official rate without a rounding gap", async () => {
        mockRates.set("VES", 36.1234);
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                arrived: 27.68,
                date: new Date(Date.UTC(2026, 8, 29)),
                fee: 0,
                feeSide: "source",
                fromAccountId: "ves",
                fromCurrency: "VES",
                id: "transfer",
                note: "",
                rate: 27.68 / 1000,
                rateType: "official",
                sent: 1000,
                toAccountId: "usd",
                toCurrency: "USD",
            })
        );
        expect(result.current).toMatchObject({ canSave: true, gapAmount: 0, rateType: "official" });
    });
});

describe("an arrival the user typed", () => {
    beforeEach(() => {
        mockRates.set("VES", 50);
        mockBinanceRates.set("VES", 49);
    });

    async function typedArrival(): Promise<{ current: TransferDraft }> {
        const result = await pinnedDraft("100", "4900");
        expect(result.current).toMatchObject({ arrived: 4900, gapAmount: 0, rateType: "binance" });
        return result;
    }

    it("stays when the amount sent changes, and counts the difference", async () => {
        const result = await typedArrival();
        await act(async () => {
            result.current.setSent("110");
        });
        expect(result.current).toMatchObject({ arrived: 4900, gapAmount: 10 });
    });

    it("follows the rate again once it is cleared", async () => {
        const result = await typedArrival();
        await act(async () => {
            result.current.setArrived("");
        });
        await act(async () => {
            result.current.setSent("110");
        });
        expect(result.current).toMatchObject({ arrived: 5390, gapAmount: 0 });
    });

    it("holds nothing while the keypad reads zero", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setArrived("0.");
        });
        await act(async () => {
            result.current.setSent("100");
        });
        expect(result.current).toMatchObject({ arrived: 4900, block: null, gapAmount: 0 });
    });

    it("holds nothing when only prefilled for the keypad", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setSent("100");
        });
        await act(async () => {
            result.current.prefillArrival();
        });
        await act(async () => {
            result.current.setSent("110");
        });
        expect(result.current).toMatchObject({ arrived: 5390, gapAmount: 0 });
    });
});

describe("an arrival seen for another pair", () => {
    beforeEach(() => {
        mockRates.set("VES", 50);
        mockRates.set("MXN", 18);
    });

    it("does not count as seeing the conversion", async () => {
        const result = await draft();
        await act(async () => {
            result.current.chooseFrom(mockAccounts[0] ?? null);
        });
        await act(async () => {
            result.current.chooseTo(mockAccounts[3] ?? null);
        });
        await act(async () => {
            result.current.prefillArrival();
        });
        await act(async () => {
            result.current.chooseTo(mockAccounts[1] ?? null);
        });
        expect(result.current.arrivalSeen).toBe(false);
        await act(async () => {
            result.current.prefillArrival();
        });
        expect(result.current.arrivalSeen).toBe(true);
        await act(async () => {
            result.current.chooseTo(mockAccounts[8] ?? null);
        });
        expect(result.current.arrivalSeen).toBe(false);
    });
});

describe("a fee charged on top", () => {
    const stored: Omit<SavedTransfer, "arrived" | "fee" | "feeSide" | "sent"> = {
        date: new Date(Date.UTC(2026, 8, 30)),
        fromAccountId: "usd",
        fromCurrency: "USD",
        id: "transfer",
        note: "",
        rate: 1,
        rateType: null,
        toAccountId: "usd-2",
        toCurrency: "USD",
    };

    async function onTop(fee: string, toDestination = false): Promise<{ current: TransferDraft }> {
        const seed = toDestination ? undefined : { fromAccountId: "usd", toAccountId: "usd-2" };
        const { result } = await renderHook(() => useTransferDraft({} as Database, seed));
        await act(async () => {
            result.current.setSent(toDestination ? "100" : "500");
        });
        if (toDestination) {
            await act(async () => {
                result.current.toggleFeeSide();
            });
        }
        await act(async () => {
            result.current.setFeeMode("onTop");
        });
        await act(async () => {
            result.current.setFee(fee);
        });
        return result;
    }

    it("reopens a fee on top of the amount sent as the included fee with the same balances", async () => {
        mockBalances.set("usd", 2310);
        mockBalances.set("usd-2", 4120.55);
        const result = await onTop("25");
        expect(result.current).toMatchObject({
            fromBalanceAfter: 1785,
            legs: { fromAmount: 500, toAmount: 500 },
            toBalanceAfter: 4620.55,
        });

        mockBalances.set("usd", 1785);
        mockBalances.set("usd-2", 4620.55);
        const { result: reopened } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                ...stored,
                arrived: 500,
                fee: 25,
                feeSide: "source",
                sent: 525,
            })
        );

        expect(reopened.current).toMatchObject({
            feeMode: "included",
            fromBalanceAfter: 1785,
            legs: { fromAmount: 500, toAmount: 500 },
            toBalanceAfter: 4620.55,
        });
    });

    it("reopens a bolívar fee on top of the arrival as the included fee with the same balances", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await onTop("150", true);
        expect(result.current).toMatchObject({
            arrived: 5550,
            feeCurrency: "VES",
            legs: { fromAmount: 100, toAmount: 5550 },
            toBalanceAfter: 5400,
        });

        mockBalances.set("usd", -100);
        mockBalances.set("ves", 5400);
        const { result: reopened } = await renderHook(() =>
            useTransferDraft({} as Database, undefined, {
                ...stored,
                arrived: 5400,
                fee: 150,
                feeSide: "destination",
                rate: OFFICIAL_VES_PER_USD,
                rateType: "official",
                sent: 100,
                toAccountId: "ves",
                toCurrency: "VES",
            })
        );

        expect(reopened.current).toMatchObject({
            fromBalanceAfter: -100,
            legs: { fromAmount: 100, toAmount: 5550 },
            toBalanceAfter: 5400,
        });
    });

    it("books a loss on top of it as an included fee that keeps what the source pays", async () => {
        mockBalances.set("usd", 2310);
        const result = await onTop("25");
        await act(async () => {
            result.current.setArrived("480");
        });
        expect(result.current).toMatchObject({ fromBalanceAfter: 1785, gapAmount: 20 });

        await act(async () => {
            result.current.resolveAsFee();
        });

        expect(result.current).toMatchObject({
            fee: 45,
            feeMode: "included",
            fromBalanceAfter: 1785,
            gapAmount: 0,
            legs: { fromAmount: 480, toAmount: 480 },
            paid: 525,
        });
    });

    it("books a loss on top of a bolívar fee as an included fee that keeps what arrives", async () => {
        mockRates.set("VES", OFFICIAL_VES_PER_USD);
        const result = await onTop("150", true);
        await act(async () => {
            result.current.setArrived("5000");
        });
        expect(result.current).toMatchObject({ gapAmount: 550, toBalanceAfter: 4850 });

        await act(async () => {
            result.current.resolveAsFee();
        });

        expect(result.current).toMatchObject({
            fee: 700,
            feeMode: "included",
            gapAmount: 0,
            legs: { fromAmount: 100, toAmount: 5550 },
            toBalanceAfter: 4850,
        });
    });

    it("names the overrun against the typed arrival when the destination pays more than arrives", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "usd", toAccountId: "usd-2" })
        );
        await act(async () => {
            result.current.setSent("500");
        });
        await act(async () => {
            result.current.toggleFeeSide();
        });
        await act(async () => {
            result.current.setFee("25");
        });
        await act(async () => {
            result.current.setArrived("20");
        });
        await act(async () => {
            result.current.setFeeMode("onTop");
        });

        expect(result.current.block).toStrictEqual({ kind: "fee", shortfall: -5 });
    });

    it("blocks nothing while a fee on top waits for an amount", async () => {
        const { result } = await renderHook(() =>
            useTransferDraft({} as Database, { fromAccountId: "usd", toAccountId: "usd-2" })
        );
        await act(async () => {
            result.current.setFeeMode("onTop");
        });
        await act(async () => {
            result.current.setFee("5");
        });

        expect(result.current.block).toBeNull();
    });

    it("keeps no fee when the fee keypad only deletes", async () => {
        const result = await draft();
        await act(async () => {
            result.current.setFee("");
        });

        expect(result.current.feeMode).toBe("none");
    });
});
