import { describe, expect, it } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";

import { transactions, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import type { LogFilter } from "@/domain/log-filter";

import { logTransferBounds, useLogTransfers } from "./transfer-log";
import type { TransferScope } from "./transfer-log";

const MID_MARCH = new Date(2026, 2, 18, 15, 30);
const FEB_1 = new Date(2026, 1, 1);
const MARCH_1 = new Date(2026, 2, 1);
const APRIL_1 = new Date(2026, 3, 1);

function scope(filter: LogFilter, overrides: Partial<TransferScope> = {}): TransferScope {
    return {
        cursor: MID_MARCH,
        filter,
        firstWeekday: 1,
        page: { floor: FEB_1, reachedEnd: false },
        ...overrides,
    };
}

describe("logTransferBounds", () => {
    it("holds the unfiltered list's transfers to the days it has actually loaded", () => {
        const bounds = logTransferBounds(scope("all"));

        expect(bounds?.since).toStrictEqual(FEB_1);
        expect(bounds?.until).toBeNull();
    });

    it("reaches back past that floor once the list has loaded every day there is", () => {
        const bounds = logTransferBounds(scope("all", { page: { floor: FEB_1, reachedEnd: true } }));

        expect(bounds?.since).toBeNull();
    });

    it("holds a week filter to the week its cursor names, on the weekday the owner starts on", () => {
        const sunday = logTransferBounds(scope("week", { firstWeekday: 1 }));
        const monday = logTransferBounds(scope("week", { firstWeekday: 2 }));

        expect(sunday?.since).toStrictEqual(new Date(2026, 2, 15));
        expect(sunday?.until).toStrictEqual(new Date(2026, 2, 22));
        expect(monday?.since).toStrictEqual(new Date(2026, 2, 16));
        expect(monday?.until).toStrictEqual(new Date(2026, 2, 23));
    });

    it("normalizes a cursor that still carries a time of day", () => {
        const bounds = logTransferBounds(scope("month", { cursor: new Date(2026, 2, 31, 23, 59, 59) }));

        expect(bounds?.since).toStrictEqual(MARCH_1);
        expect(bounds?.until).toStrictEqual(APRIL_1);
    });

    it.each<LogFilter>(["category"])(
        "admits no transfer to the %s filter, which a transfer answers nothing about",
        (filter) => {
            expect(logTransferBounds(scope(filter))).toBeNull();
        }
    );

    it("measures a period against the same column the transactions beside it use", () => {
        for (const filter of ["week", "month"] as LogFilter[]) {
            expect(logTransferBounds(scope(filter))?.floorOn).toBe("date");
        }
    });

    it("pages the window on the day it was floored at, as the window itself is", () => {
        expect(logTransferBounds(scope("all"))?.floorOn).toBe("day");
    });

    it("leaves the transfers tab every transfer ever recorded", () => {
        expect(logTransferBounds(scope("transfers"))).toStrictEqual({ floorOn: "day", since: null, until: null });
    });
});

describe("useLogTransfers", () => {
    it("reads each transfer with the fee charged on it", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const when = { date: MID_MARCH, day: MARCH_1, month: MARCH_1, updatedAt: MID_MARCH };
        await db.insert(transfers).values({
            ...when,
            dateCreated: MID_MARCH,
            fromAccountId: "chase",
            fromAmount: 98,
            fromCurrency: "USD",
            id: "move",
            toAccountId: "ally",
            toAmount: 98,
            toCurrency: "USD",
        });
        await db.insert(transactions).values({
            ...when,
            accountId: "chase",
            amount: 2,
            currency: "USD",
            id: "fee",
            income: false,
            transferId: "move",
        });

        const { result } = await renderHook(() =>
            useLogTransfers(db, APRIL_1.getTime(), { floorOn: "day", since: null, until: null })
        );

        expect(result.current.map((row) => row.moved)).toStrictEqual([
            { arrived: 98, arrivedCurrency: "USD", fee: { amount: 2, currency: "USD" }, outside: null, sent: 100 },
        ]);
    });
});
