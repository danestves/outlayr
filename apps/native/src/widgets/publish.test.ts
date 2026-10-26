import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";

import type { WidgetProps } from "./props";
import { publishWidgets as publish } from "./publish";

const publishWidgets = (db: Database) => Effect.runPromise(publish(db));

/** Catches a widget whose import and update call were removed together, leaving its tile stale. */
jest.mock("./budget", () => ({ __esModule: true, default: { updateTimeline: jest.fn() } }));
jest.mock("./insights", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("./ledger", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("./log", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("@/lib/widget-bridge", () => ({ publishIntentSnapshot: jest.fn(), publishWalletPush: jest.fn() }));
jest.mock("@/data/wallet-push", () => ({ buildWalletPush: () => require("effect/Effect").succeed({}) }));
jest.mock("@/data/pending-writes-core", () => ({
    appliedWriteIds: () => require("effect/Effect").succeed(["watch-write"]),
}));
jest.mock("@/lib/watch-link", () => ({ publishWatchSnapshot: jest.fn() }));

// `__esModule` on the factories, or babel's interop wraps the whole factory as `default`.
const widget = <Module extends { default: unknown }>(path: string): Module["default"] =>
    jest.requireMock<Module>(path).default;
const updates = {
    Budget: jest.mocked(widget<typeof import("./budget")>("./budget").updateTimeline),
    Insights: jest.mocked(widget<typeof import("./insights")>("./insights").updateSnapshot),
    Ledger: jest.mocked(widget<typeof import("./ledger")>("./ledger").updateSnapshot),
    Log: jest.mocked(widget<typeof import("./log")>("./log").updateSnapshot),
};

const mockProps: WidgetProps = {
    // SAFETY: only the fields publishWidgets reads on its way to the update calls.
    Budget: { views: { auto: { present: false } } } as unknown as WidgetProps["Budget"],
    categories: [],
    currency: "USD",
    Insights: { defaultPeriod: "month", windows: { month: {} } } as unknown as WidgetProps["Insights"],
    Ledger: {} as WidgetProps["Ledger"],
    Log: {} as WidgetProps["Log"],
    intentBudgets: [],
    showCents: true,
    watchEntries: [],
    week: { average: "$0", days: [] },
    zeroSpent: "$0.00",
};
jest.mock("./props", () => ({
    buildWidgetProps: jest.fn(() => require("effect/Effect").succeed(mockProps)),
}));

beforeEach(() => {
    for (const update of Object.values(updates)) {
        update.mockClear();
    }
});

describe("publishWidgets", () => {
    it("refreshes every widget the build declares", async () => {
        await publishWidgets(mockUnusedDatabase());

        expect(
            Object.fromEntries(Object.entries(updates).map(([name, update]) => [name, update.mock.calls.length]))
        ).toStrictEqual({
            Budget: 1,
            Insights: 1,
            Ledger: 1,
            Log: 1,
        });
        expect(updates.Ledger).toHaveBeenCalledWith(mockProps.Ledger);
        expect(updates.Insights).toHaveBeenCalledWith(mockProps.Insights);
        expect(updates.Log).toHaveBeenCalledWith(mockProps.Log);
    });

    it("hands the watch the writes the phone applied and the week", async () => {
        const publishWatchSnapshot = jest.mocked(
            jest.requireMock<typeof import("@/lib/watch-link")>("@/lib/watch-link").publishWatchSnapshot
        );

        await publishWidgets(mockUnusedDatabase());

        const snapshot = publishWatchSnapshot.mock.calls[0]?.[0];
        expect(snapshot?.applied.ids).toStrictEqual(["watch-write"]);
        expect(snapshot?.applied.since).toBeLessThan(snapshot?.publishedAt ?? 0);
        expect(snapshot?.week).toBe(mockProps.week);
    });

    it("leaves a stale tile rather than throwing when the build fails", async () => {
        const buildWidgetProps = jest.mocked(jest.requireMock<typeof import("./props")>("./props").buildWidgetProps);
        buildWidgetProps.mockReturnValueOnce(Effect.die(new Error("build failed")));

        await expect(publishWidgets(mockUnusedDatabase())).resolves.toBeUndefined();
        expect(updates.Log).not.toHaveBeenCalled();
    });
});
