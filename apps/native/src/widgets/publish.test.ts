import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";
import { publishWatchSnapshot } from "@/lib/watch-link";

import budget from "./budget";
import insights from "./insights";
import ledger from "./ledger";
import log from "./log";
import { buildWidgetProps } from "./props";
import type { WidgetProps } from "./props";
import { publishWidgets as publish } from "./publish";

const publishWidgets = (db: Database) => Effect.runPromise(publish(db));

/** Catches a widget whose import and update call were removed together, leaving its tile stale. */
vi.mock("./budget", () => ({ default: { updateTimeline: vi.fn() } }));
vi.mock("./insights", () => ({ default: { updateSnapshot: vi.fn() } }));
vi.mock("./ledger", () => ({ default: { updateSnapshot: vi.fn() } }));
vi.mock("./log", () => ({ default: { updateSnapshot: vi.fn() } }));
vi.mock("@/lib/widget-bridge", () => ({ publishIntentSnapshot: vi.fn(), publishWalletPush: vi.fn() }));
vi.mock("@/data/wallet-push", () => ({ buildWalletPush: () => Effect.succeed({}) }));
vi.mock("@/data/pending-writes-core", () => ({
    appliedWriteIds: () => Effect.succeed(["watch-write"]),
}));
vi.mock("@/lib/watch-link", () => ({ publishWatchSnapshot: vi.fn() }));

const updates = {
    Budget: vi.mocked(budget.updateTimeline),
    Insights: vi.mocked(insights.updateSnapshot),
    Ledger: vi.mocked(ledger.updateSnapshot),
    Log: vi.mocked(log.updateSnapshot),
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
vi.mock("./props", () => ({
    buildWidgetProps: vi.fn(() => Effect.succeed(mockProps)),
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
        await publishWidgets(mockUnusedDatabase());

        const snapshot = vi.mocked(publishWatchSnapshot).mock.calls[0]?.[0];
        expect(snapshot?.applied.ids).toStrictEqual(["watch-write"]);
        expect(snapshot?.applied.since).toBeLessThan(snapshot?.publishedAt ?? 0);
        expect(snapshot?.week).toBe(mockProps.week);
    });

    it("leaves a stale tile rather than throwing when the build fails", async () => {
        vi.mocked(buildWidgetProps).mockReturnValueOnce(Effect.die(new Error("build failed")));

        await expect(publishWidgets(mockUnusedDatabase())).resolves.toBeUndefined();
        expect(updates.Log).not.toHaveBeenCalled();
    });
});
