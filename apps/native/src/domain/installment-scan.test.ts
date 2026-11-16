import { draftSchedule } from "@outlayr/money/installment-draft";
import { describe, expect, it } from "vite-plus/test";

import type { InstallmentPlanDraft, InstallmentPlanRow } from "@/lib/cloud-ai";

import {
    encodeInstallmentSeed,
    matchedAccount,
    parseInstallmentSeed,
    planImport,
    scannedOrder,
    scannedStanding,
} from "./installment-scan";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

const cashea = (rows: InstallmentPlanRow[]): InstallmentPlanDraft => ({
    accountName: "Cashea",
    currency: "USD",
    name: null,
    provider: "Cashea",
    rows,
});

const row = (sequence: number, dueDate: string, amount: number, paid: boolean, fee = 0): InstallmentPlanRow => ({
    amount,
    dueDate,
    fee,
    paid,
    sequence,
});

const LATE_TWICE = cashea([
    row(0, "2026-06-08", 67.6, true),
    row(1, "2026-06-22", 33.8, true, 4),
    row(2, "2026-07-06", 33.8, false),
    row(3, "2026-07-20", 33.8, false, 4),
]);

const LATE_ONCE = cashea([
    row(0, "2026-06-01", 79.6, true),
    row(1, "2026-06-15", 106.13, true),
    row(2, "2026-06-29", 106.13, false),
    row(3, "2026-07-13", 106.13, false, 4),
]);

const LAST_CUOTA_LEFT = cashea([
    row(0, "2026-05-29", 22.9, true),
    row(1, "2026-06-12", 30.53, true),
    row(2, "2026-06-26", 30.53, true),
    row(3, "2026-07-10", 30.53, false, 4),
]);

function replayed(plan: InstallmentPlanDraft) {
    const order = scannedOrder(plan, "USD");
    if (order === null) {
        throw new Error("Expected an order");
    }
    const schedule = draftSchedule(order.draft, order.price, order.purchaseDay, "USD");
    return {
        order,
        schedule: schedule?.map(({ amount, dueDate, sequence }) => ({ amount, dueDate, sequence })),
        scanned: plan.rows.map(({ amount, dueDate, sequence }) => ({
            amount,
            dueDate: new Date(`${dueDate}T00:00:00`),
            sequence,
        })),
    };
}

describe("scannedOrder", () => {
    it.each([
        ["late twice", LATE_TWICE, 169, 1],
        ["late once", LATE_ONCE, 397.99, 1],
        ["one cuota left", LAST_CUOTA_LEFT, 114.49, 2],
    ])("a Cashea order %s replays as Inicial plus three cuotas every 14 days", (_name, plan, price, paidBefore) => {
        const { order, schedule, scanned } = replayed(plan);
        expect(schedule).toStrictEqual(scanned);
        expect(order.price).toBe(price);
        expect(order.draft).toMatchObject({ count: 3, edits: {}, every: "days14", paidBefore, upfrontAccountId: null });
        expect(order.purchaseDay).toStrictEqual(scanned[0]?.dueDate);
    });

    it("keeps the fees apart from the price, one per row that carries one", () => {
        expect(replayed(LATE_TWICE).order.fees).toStrictEqual([
            { amount: 4, sequence: 1 },
            { amount: 4, sequence: 3 },
        ]);
        expect(replayed(LATE_ONCE).order.fees).toStrictEqual([{ amount: 4, sequence: 3 }]);
    });

    it("a monthly plan without upfront starts a month before its first cuota and keeps the cuotas that drift", () => {
        const plan = cashea([
            row(1, "2026-11-15", 50, true),
            row(2, "2026-12-15", 50, false),
            row(3, "2027-01-17", 55, false),
        ]);
        const { order, schedule, scanned } = replayed(plan);
        expect(schedule).toStrictEqual(scanned);
        expect(order.price).toBe(155);
        expect(order.purchaseDay).toStrictEqual(day(2026, 10, 15));
        expect(order.draft).toMatchObject({ every: "monthly", paidBefore: 1, upfront: { amount: 0 } });
    });

    it("is null without a cuota to schedule", () => {
        expect(scannedOrder(cashea([row(0, "2026-06-08", 60, true)]), "USD")).toBeNull();
    });
});

describe("installment seed param", () => {
    it("round trips a scanned order's draft and fees, edits included, with no account to pay from", () => {
        const { order } = replayed(
            cashea([
                row(1, "2026-11-15", 50, true, 3),
                row(2, "2026-12-15", 50, false),
                row(3, "2027-01-17", 55, false),
            ])
        );
        expect(Object.keys(order.draft.edits)).not.toHaveLength(0);
        const param = encodeInstallmentSeed({ ...order, draft: { ...order.draft, upfrontAccountId: "bank" } });
        expect(parseInstallmentSeed(param)).toStrictEqual({ draft: order.draft, fees: order.fees });
    });

    const valid = JSON.parse(encodeInstallmentSeed(replayed(LATE_TWICE).order));

    it.each([
        ["not JSON", "{count:3"],
        ["a count past the cap", JSON.stringify({ ...valid, count: 49 })],
        ["more cuotas paid than exist", JSON.stringify({ ...valid, paidBefore: 4 })],
        ["a fee on a cuota that does not exist", JSON.stringify({ ...valid, fees: [{ amount: 4, sequence: 4 }] })],
        ["an edit on a cuota that does not exist", JSON.stringify({ ...valid, edits: { 4: { amount: 1 } } })],
        ["an edit on the upfront", JSON.stringify({ ...valid, edits: { 0: { amount: 1 } } })],
        ["a negative fee", JSON.stringify({ ...valid, fees: [{ amount: -4, sequence: 1 }] })],
        ["a date that is not one", JSON.stringify({ ...valid, firstDue: "tomorrow" })],
        ["an unknown cadence", JSON.stringify({ ...valid, every: "daily" })],
    ])("rejects %s", (_name, param) => {
        expect(parseInstallmentSeed(param)).toBeUndefined();
    });
});

describe("one plan of a scanned list", () => {
    const accounts = [
        { currency: "USD", name: "Cashea" },
        { currency: "USD", name: " krece " },
        { currency: "VES", name: "Visa" },
    ] as const;
    const [casheaAccount, kreceAccount, visa] = accounts;

    it("files into the account the model named, else the one carrying the provider's name, else the scanned one", () => {
        const plan = cashea([row(1, "2026-11-15", 23.33, false)]);
        expect(matchedAccount({ ...plan, accountName: "Visa" }, accounts, casheaAccount)).toBe(visa);
        expect(matchedAccount({ ...plan, accountName: null, provider: "Krece" }, accounts, casheaAccount)).toBe(
            kreceAccount
        );
        expect(matchedAccount({ ...plan, accountName: null, provider: "Lysto" }, accounts, visa)).toBe(visa);
    });

    it("is foreign when the plan's currency is not its account's", () => {
        const plan = cashea([row(1, "2026-11-15", 23.33, false)]);
        expect(planImport(plan, visa)).toStrictEqual({ currency: "USD", kind: "foreign" });
        expect(planImport({ ...plan, currency: null }, visa).kind).toBe("ready");
    });

    it("owes the unpaid cuotas from the first one due, counting its days late from today", () => {
        const plan = cashea([
            row(1, "2026-11-01", 23.33, true),
            ...["2026-11-15", "2026-11-29", "2026-12-13", "2026-12-27", "2027-01-10"].map((dueDate, index) =>
                row(index + 2, dueDate, 23.33, false)
            ),
        ]);
        const result = planImport(plan, casheaAccount);
        if (result.kind !== "ready") {
            throw new Error(`Expected a ready plan, got ${result.kind}`);
        }
        const standing = scannedStanding(result.order, "USD", new Date(2026, 10, 16, 20, 30));
        expect(standing).toMatchObject({ count: 6, left: 116.65, next: { daysLate: 1, sequence: 2 } });
        expect(scannedStanding(result.order, "USD", new Date(2026, 10, 15, 9))?.next?.daysLate).toBe(0);
    });
});
