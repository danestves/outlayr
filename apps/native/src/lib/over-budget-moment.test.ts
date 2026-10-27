import { describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";

import { claimOverBudgetMoment as claim, overBudgetMomentKey } from "./over-budget-moment";

const claimOverBudgetMoment = (key: string) => Effect.runPromise(claim(key));

jest.mock<Partial<typeof import("@react-native-async-storage/async-storage")>>(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("claimOverBudgetMoment", () => {
    it("plays a budget's over moment once per window and remembers it on the device", async () => {
        const september = overBudgetMomentKey("fuel", new Date("2026-09-01T00:00:00Z"));
        const october = overBudgetMomentKey("fuel", new Date("2026-10-01T00:00:00Z"));

        await expect(claimOverBudgetMoment(september)).resolves.toBe(true);
        await expect(claimOverBudgetMoment(september)).resolves.toBe(false);
        await expect(claimOverBudgetMoment(october)).resolves.toBe(true);
        await expect(AsyncStorage.getItem("outlayr.over-budget-seen")).resolves.toBe(
            JSON.stringify([september, october])
        );
    });

    it("keeps every budget that crosses at the same moment", async () => {
        const window = new Date("2026-11-01T00:00:00Z");
        const [fuel, dining] = await Promise.all([
            claimOverBudgetMoment(overBudgetMomentKey("fuel", window)),
            claimOverBudgetMoment(overBudgetMomentKey("dining", window)),
        ]);

        expect([fuel, dining]).toStrictEqual([true, true]);
        const saved = await AsyncStorage.getItem("outlayr.over-budget-seen");
        expect(saved).toContain(overBudgetMomentKey("fuel", window));
        expect(saved).toContain(overBudgetMomentKey("dining", window));
    });

    it("does not replay a moment this device saw in an earlier launch", async () => {
        const rent = overBudgetMomentKey("rent", new Date("2026-12-01T00:00:00Z"));

        jest.resetModules();
        const storage = require("@react-native-async-storage/async-storage") as typeof AsyncStorage;
        await storage.setItem("outlayr.over-budget-seen", JSON.stringify([rent]));
        const relaunched = require("./over-budget-moment") as typeof import("./over-budget-moment");

        await expect(Effect.runPromise(relaunched.claimOverBudgetMoment(rent))).resolves.toBe(false);
    });
});
