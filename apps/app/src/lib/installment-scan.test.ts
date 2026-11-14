import { describe, expect, it } from "vite-plus/test";

import { scannedSeed } from "./installment-scan";
import type { ScannedPlan } from "./installment-scan";
import { planPurchase } from "./plan-writes";

const row = (sequence: number, dueDate: string, amount: number, paid = false, fee = 0) => ({
    amount,
    dueDate,
    fee,
    paid,
    sequence,
});

const scanned = (rows: ScannedPlan["rows"]): ScannedPlan => ({
    accountName: null,
    currency: "USD",
    provider: null,
    rows,
});

function replayed(plan: ScannedPlan) {
    const seed = scannedSeed(plan, { currency: "USD", id: "card" });
    if (seed === null) {
        throw new Error("no seed");
    }
    const purchase = planPurchase({ ...seed, currency: "USD", each: null, now: new Date(2026, 10, 10) });
    return { purchase, seed };
}

const local = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));

describe("scannedSeed", () => {
    it("gives the purchase form back the exact rows it read, uneven amounts and off-cadence days included", () => {
        const rows = [
            row(0, "2026-10-01", 50, true),
            row(1, "2026-11-01", 100, true, 5),
            row(2, "2026-12-03", 101),
            row(3, "2027-01-01", 100),
        ];
        const { purchase, seed } = replayed(scanned(rows));
        expect(purchase.schedule?.map((each) => [each.sequence, each.amount, each.dueDate.getTime()])).toEqual(
            rows.map((each) => [each.sequence, each.amount, local(each.dueDate).getTime()])
        );
        expect([seed.every, seed.price, seed.paidBefore]).toEqual(["monthly", 351, 1]);
        expect(seed.fees).toEqual([{ amount: 5, sequence: 1 }]);
        expect(purchase.over).toBe(0);
    });

    it("dates a plan with no upfront one interval before its first row", () => {
        const { seed } = replayed(
            scanned([row(1, "2026-11-14", 40), row(2, "2026-11-28", 40), row(3, "2026-12-12", 40)])
        );
        expect([seed.every, seed.purchaseDay.getTime()]).toEqual(["days14", local("2026-10-31").getTime()]);
    });

    it("refuses a plan with only an upfront", () => {
        expect(scannedSeed(scanned([row(0, "2026-11-01", 80, true)]), { currency: "USD", id: "card" })).toBeNull();
    });
});
