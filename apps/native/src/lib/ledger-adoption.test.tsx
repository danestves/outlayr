import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import * as mockEffect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { ReactNode } from "react";
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
    reconcileAdoption: () => mockEffect.promise(() => mockReconcile()),
}));

import { appRuntime } from "@/lib/runtime";

import { LedgerAdoptionProvider, useLedgerAdoption } from "./ledger-adoption";

const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });

function Harness({ children }: { children: ReactNode }) {
    return <RegistryContext value={registry}>{children}</RegistryContext>;
}

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
            <Harness>
                <LedgerAdoptionProvider>
                    <Status />
                </LedgerAdoptionProvider>
            </Harness>
        );
        await act(async () => undefined);
        expect(mockReconcile).toHaveBeenCalledTimes(1);

        mockPro.pending = true;
        await rerender(
            <Harness>
                <LedgerAdoptionProvider>
                    <Status />
                </LedgerAdoptionProvider>
            </Harness>
        );
        mockPro.pending = false;
        await rerender(
            <Harness>
                <LedgerAdoptionProvider>
                    <Status />
                </LedgerAdoptionProvider>
            </Harness>
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
