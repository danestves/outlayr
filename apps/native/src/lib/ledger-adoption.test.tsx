import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";

const mockDatabase = mockUnusedDatabase();
jest.mock("@/contexts/local-data-context", () => ({ useDatabase: () => mockDatabase }));
jest.mock("@/lib/auth-session", () => ({ useAuthSession: () => ({ accountId: "acct-1" }) }));
jest.mock("@/data/live-query", () => ({ useLiveValue: () => null }));
const mockPro = { locked: false, pending: false };
jest.mock("@/hooks/use-pro-locked", () => ({
    useProLocked: () => mockPro.locked,
    useProPending: () => mockPro.pending,
}));
let mockRelease: () => void = () => undefined;
const mockReconcile = jest.fn(
    () =>
        new Promise<string>((resolve) => {
            mockRelease = () => resolve("settled");
        })
);
jest.mock("@/state/lifecycle-commands", () => ({
    completeAdoptionCommand: {},
    reconcileAdoptionCommand: {},
    runLifecycleCommand: () => mockReconcile(),
}));

import { LedgerAdoptionProvider, useLedgerAdoption } from "./ledger-adoption";

function Status() {
    return <Text>{useLedgerAdoption().status}</Text>;
}

describe("ledgerAdoptionProvider", () => {
    beforeEach(() => {
        mockReconcile.mockClear();
        mockPro.pending = false;
    });

    it("runs one adoption per account even when the entitlement flips mid-flight", async () => {
        const { getByText, rerender } = await render(
            <LedgerAdoptionProvider>
                <Status />
            </LedgerAdoptionProvider>
        );
        await act(async () => undefined);
        expect(mockReconcile).toHaveBeenCalledTimes(1);

        mockPro.pending = true;
        await rerender(
            <LedgerAdoptionProvider>
                <Status />
            </LedgerAdoptionProvider>
        );
        mockPro.pending = false;
        await rerender(
            <LedgerAdoptionProvider>
                <Status />
            </LedgerAdoptionProvider>
        );
        await act(async () => undefined);

        expect(mockReconcile).toHaveBeenCalledTimes(1);
        expect(getByText("resolving")).toBeTruthy();

        await act(async () => {
            mockRelease();
        });
        expect(getByText("settled")).toBeTruthy();
    });
});
