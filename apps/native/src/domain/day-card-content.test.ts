import { describe, expect, it } from "vite-plus/test";

import { dayCardContent, dayCardFileName } from "./day-card-content";

const DAY = new Date(2026, 6, 29);

const ROWS = [
    {
        amount: 12.5,
        categoryName: "Groceries",
        currency: "EUR",
        date: new Date(2026, 6, 29, 9, 30),
        income: false,
        note: "Bakery",
    },
    {
        amount: 30,
        categoryName: "Shopping",
        currency: null,
        date: new Date(2026, 6, 29, 11, 0),
        income: true,
        note: "Refund",
    },
];

const SECTION = {
    data: ROWS,
    day: DAY,
    totals: [{ amount: -42.5, currencyCode: "USD", transactionCount: 2 }],
};

const OPTIONS = {
    currency: "USD",
    showCents: true,
    swapTimeLabel: false,
    use24Hour: false,
};

describe("dayCardContent", () => {
    it("titles the card with the day", () => {
        expect(dayCardContent(SECTION, OPTIONS, DAY).dayLabel).toBe("TODAY");
    });

    it("joins two currencies with a slash rather than adding them", () => {
        const mixed = {
            ...SECTION,
            totals: [
                { amount: -20, currencyCode: "USD", transactionCount: 1 },
                { amount: -12.5, currencyCode: "EUR", transactionCount: 1 },
            ],
        };
        expect(dayCardContent(mixed, OPTIONS, DAY).total).toBe("-$20.00 / -€12.50");
    });

    it("signs each row and uses the row's own currency", () => {
        const card = dayCardContent(SECTION, OPTIONS, DAY);
        expect(card.rows[0]?.amount).toBe("-€12.50");
        expect(card.rows[1]?.amount).toBe("+$30.00");
    });

    it("drops the cents when the setting is off", () => {
        const card = dayCardContent(SECTION, { ...OPTIONS, showCents: false }, DAY);
        expect(card.rows[0]?.amount).toBe("-€12");
    });

    it("subtitles a row on a 24-hour clock when the setting asks for one", () => {
        const card = dayCardContent(SECTION, { ...OPTIONS, use24Hour: true }, DAY);
        expect(card.rows[0]?.meta).toBe("09:30");
    });

    it("subtitles with the category when the label is swapped", () => {
        const card = dayCardContent(SECTION, { ...OPTIONS, swapTimeLabel: true }, DAY);
        expect(card.rows[0]?.meta).toBe("Groceries");
    });
});

describe("dayCardFileName", () => {
    it("names the file after the day it shows", () => {
        expect(dayCardFileName(DAY)).toBe("outlayr-2026-07-29.png");
    });
});
