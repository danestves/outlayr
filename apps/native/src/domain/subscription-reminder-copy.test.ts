import { describe, expect, it } from "vite-plus/test";

import { subscriptionReminderId } from "./subscription-reminder";
import { reminderCopy, reminderNotices } from "./subscription-reminder-copy";

const PRIME = {
    account: "Payoneer USD",
    amount: 7.06,
    category: "Streaming",
    currency: "USD",
    fireAt: new Date(2026, 9, 8, 8, 0),
    income: false,
    landing: new Date(2026, 9, 9),
    note: "Prime Video",
};

describe("reminderCopy", () => {
    it("leads with the amount and name, then when, category and account", () => {
        expect(reminderCopy(PRIME, false, "en")).toStrictEqual({
            body: "Tomorrow · Streaming · Payoneer USD",
            title: "$7.06 · Prime Video",
        });
        expect(reminderCopy(PRIME, false, "es").body).toBe("Mañana · Streaming · Payoneer USD");
    });

    it("signs a repeating income and drops a missing account", () => {
        expect(
            reminderCopy(
                { ...PRIME, account: null, amount: 2400, category: "Salary", income: true, note: "Salary" },
                false,
                "en"
            )
        ).toStrictEqual({ body: "Tomorrow", title: "+$2,400.00 · Salary" });
    });

    it("drops a category that only repeats the name, whatever its case", () => {
        expect(reminderCopy({ ...PRIME, category: " prime VIDEO " }, false, "en").body).toBe("Tomorrow · Payoneer USD");
    });

    it("names an untitled charge after its category without repeating it", () => {
        expect(reminderCopy({ ...PRIME, note: "  " }, false, "en")).toStrictEqual({
            body: "Tomorrow · Payoneer USD",
            title: "$7.06 · Streaming",
        });
    });

    it("falls back to the generic name with neither a note nor a category", () => {
        expect(reminderCopy({ ...PRIME, category: null, note: "" }, false, "en").title).toBe("$7.06 · Subscription");
    });

    it("leaves the amount and its sign off the title when amounts are hidden", () => {
        expect(reminderCopy(PRIME, true, "en")).toStrictEqual({
            body: "Tomorrow · Streaming · Payoneer USD",
            title: "Prime Video",
        });
        expect(reminderCopy({ ...PRIME, income: true }, true, "en").title).toBe("Prime Video");
    });
});

const armed = (localId: string, overrides: Partial<typeof PRIME & { amountUsd: number | null }> = {}) => ({
    ...PRIME,
    amountUsd: PRIME.amount,
    chargeId: `${localId}.next`,
    id: subscriptionReminderId(localId),
    localId,
    ...overrides,
});

describe("reminderNotices", () => {
    it("folds expenses due the same day at the same time into one notice, priciest in dollars first", () => {
        expect(
            reminderNotices(
                [
                    armed("prime"),
                    armed("icloud", { amount: 2.99, amountUsd: 2.99, note: "iCloud+" }),
                    armed("spotify", { amount: 10.99, amountUsd: 10.99, note: "Spotify" }),
                    armed("hulu", { note: "", category: "Hulu" }),
                    armed("vix", { amount: 99, amountUsd: 5.5, currency: "MXN", note: "ViX" }),
                    armed("max", { amount: 1, amountUsd: null, note: "Max" }),
                ],
                false,
                "en"
            )
        ).toStrictEqual([
            {
                body: "Spotify $10.99 · Hulu $7.06 · Prime Video $7.06 · ViX MX$99.00 · iCloud+ $2.99 · Max $1.00",
                data: { open: "log" },
                fireAt: PRIME.fireAt,
                id: `outlayr.sub-due.digest.${PRIME.fireAt.getTime()}.${PRIME.landing.getTime()}`,
                title: "6 charges tomorrow",
            },
        ]);
    });

    it("leaves a lone expense, every income and a charge due another day as their own notices", () => {
        const notices = reminderNotices(
            [
                armed("prime"),
                armed("salary", { income: true }),
                armed("bonus", { income: true }),
                armed("adobe", { landing: new Date(2026, 9, 15) }),
            ],
            false,
            "en"
        );

        expect(notices.map(({ data, id }) => ({ data, id }))).toStrictEqual(
            ["prime", "salary", "bonus", "adobe"].map((localId) => ({
                data: { charge: `${localId}.next`, subscription: localId },
                id: subscriptionReminderId(localId),
            }))
        );
        expect(notices[0]?.title).toBe("$7.06 · Prime Video");
    });

    it("names the folded charges without their amounts when amounts are hidden", () => {
        const [digest] = reminderNotices(
            [armed("prime"), armed("spotify", { amount: 10.99, amountUsd: 10.99, note: "Spotify" })],
            true,
            "en"
        );
        expect(digest?.body).toBe("Spotify · Prime Video");
    });

    it("says when the folded charges land, counted from when the notice fires", () => {
        const title = (landing: Date, language: "en" | "es") =>
            reminderNotices([armed("a", { landing }), armed("b", { landing })], false, language)[0]?.title;

        expect(title(new Date(2026, 9, 8), "en")).toBe("2 charges today");
        expect(title(new Date(2026, 9, 8), "es")).toBe("2 cobros hoy");
        expect(title(new Date(2026, 9, 9), "es")).toBe("2 cobros mañana");
        expect(title(new Date(2026, 9, 10), "en")).toBe("2 charges on Saturday");
        expect(title(new Date(2026, 9, 10), "es")).toBe("2 cobros el sábado");
        expect(title(new Date(2026, 9, 15), "en")).toBe("2 charges on Thu, 15 Oct");
        expect(title(new Date(2026, 9, 15), "es")).toBe("2 cobros el jue, 15 oct");
    });
});
