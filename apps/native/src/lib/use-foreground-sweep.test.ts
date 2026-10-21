import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import type { Database } from "@/db/client";
import { unusedDatabase } from "@/db/test-database";

import { useForegroundSweep } from "./use-foreground-sweep";

const sweep = jest.fn<(db: Database) => Promise<void>>(async () => undefined);
let changeTo: (state: AppStateStatus) => void = () => undefined;

beforeEach(() => {
    sweep.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        changeTo = listener;
        return { remove: () => undefined };
    });
});

afterEach(() => {
    jest.restoreAllMocks();
});

async function renderSweep() {
    const db = unusedDatabase();
    const { rerender } = await renderHook(
        ({ ready }: { ready: Database | null }) => {
            useForegroundSweep(ready, sweep, "Sweep");
        },
        { initialProps: { ready: null } }
    );
    expect(sweep).not.toHaveBeenCalled();
    await rerender({ ready: db });
}

describe("useForegroundSweep", () => {
    it("holds the launch pass until the idle gate hands over the database, then sweeps on each foreground", async () => {
        await renderSweep();
        expect(sweep).toHaveBeenCalledTimes(1);

        act(() => {
            changeTo("active");
        });
        expect(sweep).toHaveBeenCalledTimes(2);
    });
});
