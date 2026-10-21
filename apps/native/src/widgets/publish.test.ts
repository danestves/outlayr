import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";

import type { WidgetProps } from "./props";
import { publishWidgets } from "./publish";

/** Catches a widget whose import and update call were removed together, leaving its tile stale. */
jest.mock("./budget", () => ({ __esModule: true, default: { updateTimeline: jest.fn() } }));
jest.mock("./insights", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("./ledger", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("./log", () => ({ __esModule: true, default: { updateSnapshot: jest.fn() } }));
jest.mock("@/lib/widget-bridge", () => ({ publishIntentSnapshot: jest.fn(), publishWalletPush: jest.fn() }));
jest.mock("@/data/wallet-push", () => ({ buildWalletPush: () => Promise.resolve({}) }));
jest.mock("@/data/pending-writes-core", () => ({ appliedWriteIds: () => Promise.resolve(["watch-write"]) }));
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
jest.mock("./props", () => ({ buildWidgetProps: () => Promise.resolve(mockProps) }));

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
});
