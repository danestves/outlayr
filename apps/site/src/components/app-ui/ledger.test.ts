import { describe, expect, it } from "vite-plus/test";

import {
    accountsOverview,
    budgetPace,
    DEMO_NOW,
    daySections,
    upcoming,
    weekAhead,
    weekFigures,
    youOwe,
} from "./ledger";
import { formatDayTotal, formatSignedAmount, formatTrend } from "./money";

describe("demo ledger", () => {
    it("compares the week so far with the same stretch of the week before", () => {
        expect(weekFigures(DEMO_NOW)).toMatchObject({
            current: { expense: 597.95, income: 1450 },
            previous: { expense: 2122.16, income: 5200 },
        });
        expect(weekFigures(new Date(2026, 8, 12, 14, 0)).previous.expense).toBe(2198.46);
    });

    it("totals each day as income minus expenses, newest day first", () => {
        const [yesterday, tenth, ninth] = daySections(DEMO_NOW, 7);
        expect(yesterday?.day).toEqual(new Date(2026, 8, 11));
        expect(yesterday?.rows.map((row) => row.note)).toEqual(["GitHub", "Nike"]);
        expect([yesterday?.total, tenth?.total, ninth?.total]).toEqual([-93, -201.37, 1380.72]);
    });

    it("sums asset balances in dollars and keeps cards on the debt side", () => {
        expect(accountsOverview()).toMatchObject({ count: 6, total: 26_777.46 });
        expect(youOwe()).toBe(2082.7);
    });

    it("leaves the month budget minus September's spending, with Groceries over", () => {
        expect(budgetPace(DEMO_NOW)).toMatchObject({ left: 1018.59, over: ["Groceries"], spent: 2881.41 });
    });

    it("orders upcoming charges by landing day and counts only the next seven days", () => {
        expect(
            upcoming(DEMO_NOW)
                .slice(0, 3)
                .map(({ row }) => row.note)
        ).toEqual(["Planet Fitness", "Rent", "Netflix"]);
        expect(weekAhead(DEMO_NOW)).toBe(-24.99);
    });
});

describe("app money format", () => {
    it("formats like the app in every site language", () => {
        expect(formatSignedAmount(-1234.5, "EUR", "de")).toBe("-€1.234,50");
        expect(formatSignedAmount(1234.5, "EUR", "fr")).toBe("€1\u202F234,50");
        expect(formatSignedAmount(1234.5, "BRL", "pt")).toBe("R$1.234,50");
        expect(formatSignedAmount(486_000, "VES", "es")).toBe("Bs.\u00A0486,000.00");
        expect(formatSignedAmount(-0.001, "USD", "en")).toBe("$0.00");
        expect(formatDayTotal(-201.37, "USD", "en")).toBe("-$201.37");
        expect(formatTrend(-0.723, "de")).toBe("-72,3%");
    });
});
