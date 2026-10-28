// @vitest-environment jsdom
import { useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { localDataAtom } from "@/contexts/local-data-context";
import { testLocalData as mockTestLocalData } from "@/contexts/test-local-data";
import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";

import { DeviceResetRecovery } from "./device-reset-recovery";
import { appRuntime } from "./runtime";

const mockRecover = vi.fn<() => Effect.Effect<{ failures: string[] }, unknown>>();
const mockResumePersistedCloudDeletion =
    vi.fn<(options?: { clearOnComplete?: boolean; required?: boolean }) => Effect.Effect<boolean, unknown>>();
let mockCompleteCloudDeletion: Effect.Effect<void, unknown> | undefined;
let mockCloseDatabase: Effect.Effect<void, unknown> | undefined;
const mockDatabase = mockUnusedDatabase();
const mockLocalDataReads = vi.fn();
vi.mock("@/contexts/local-data-context", async () => {
    const { make } = await vi.importActual<typeof import("effect/reactivity/Atom")>("effect/reactivity/Atom");
    return {
        localDataAtom: make(() => {
            mockLocalDataReads();
            return null;
        }),
        useLocalData: () => mockTestLocalData({ db: mockDatabase }),
    };
});
vi.mock("@/db/client", () => ({
    closeDatabase: () => Effect.void,
}));
vi.mock("@/lib/posthog", () => ({ posthog: null }));
vi.mock("./deletion-resume", async () => ({
    DeletionResumeError: (await vi.importActual<typeof import("./deletion-resume")>("./deletion-resume"))
        .DeletionResumeError,
    resumePersistedCloudDeletion: (...args: Parameters<typeof mockResumePersistedCloudDeletion>) =>
        mockResumePersistedCloudDeletion(...args),
}));
vi.mock("./device-data-reset", () => ({
    createDeviceResetGate: ({
        closeDatabase,
        completeCloudDeletion,
    }: {
        closeDatabase: Effect.Effect<void, unknown>;
        completeCloudDeletion: Effect.Effect<void, unknown>;
    }) => {
        mockCompleteCloudDeletion = completeCloudDeletion;
        mockCloseDatabase = closeDatabase;
        return { recover: mockRecover };
    },
}));

const recovering = (failures: string[] = [], closeDatabase = false) =>
    Effect.gen(function* recover() {
        if (mockCompleteCloudDeletion) {
            yield* mockCompleteCloudDeletion;
        }
        if (closeDatabase && mockCloseDatabase) {
            yield* mockCloseDatabase;
        }
        return { failures };
    });

function LocalDataWatcher() {
    useAtomValue(localDataAtom);
    return null;
}

function renderRecovery(children: ReactNode) {
    const registry = AtomRegistry.make({
        initialValues: [[appRuntime.layer, Layer.empty]],
        scheduleTask: (task) => {
            const timer = setTimeout(task, 0);
            return () => clearTimeout(timer);
        },
    });
    return render(
        <RegistryContext value={registry}>
            <LocalDataWatcher />
            {children}
        </RegistryContext>
    );
}

describe("deviceResetRecovery", () => {
    beforeEach(() => {
        mockRecover.mockReset();
        mockResumePersistedCloudDeletion.mockReset();
        mockResumePersistedCloudDeletion.mockReturnValue(Effect.succeed(true));
        mockLocalDataReads.mockReset();
        mockCompleteCloudDeletion = undefined;
        mockCloseDatabase = undefined;
    });

    it("invokes persisted-marker recovery before rendering the root child", async () => {
        mockRecover.mockReturnValue(recovering());
        const { getByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(mockRecover).toHaveBeenCalledOnce());
        expect(mockResumePersistedCloudDeletion).toHaveBeenCalledWith({ clearOnComplete: false, required: true });
        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
    });

    it("discloses a failed recovery and retries it before rendering the ledger", async () => {
        mockResumePersistedCloudDeletion
            .mockReturnValueOnce(Effect.fail(new Error("network unavailable")))
            .mockReturnValueOnce(Effect.succeed(true));
        mockRecover.mockReturnValue(recovering());
        const { getByText, queryByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("settings.account.resetFailedTitle")).toBeTruthy());
        expect(queryByText("ledger")).toBeNull();
        await act(async () => {
            fireEvent.click(getByText("common.retry"));
        });
        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
        expect(mockRecover).toHaveBeenCalledTimes(2);
        expect(mockResumePersistedCloudDeletion).toHaveBeenCalledTimes(2);
    });

    it("reopens the database only once every store is clear, never mid-sweep", async () => {
        let reopensDuringSweep = -1;
        mockRecover.mockImplementation(() =>
            recovering([], true).pipe(
                Effect.tap(() =>
                    Effect.sync(() => {
                        reopensDuringSweep = mockLocalDataReads.mock.calls.length;
                    })
                )
            )
        );
        const { getByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );

        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
        expect(reopensDuringSweep).toBe(1);
        expect(mockLocalDataReads).toHaveBeenCalledTimes(2);
    });

    it("does not reopen on an ordinary launch, when there was no reset to recover", async () => {
        mockRecover.mockReturnValue(Effect.succeed({ failures: [] }));
        const { getByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
        expect(mockLocalDataReads).toHaveBeenCalledOnce();
    });

    it("leaves the database closed when a store failed, rather than reopening onto a half-erased device", async () => {
        mockRecover.mockReturnValue(recovering(["photos"], true));
        const { getByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );

        await waitFor(() => expect(getByText("Device cleanup incomplete: photos")).toBeTruthy());
        expect(mockLocalDataReads).toHaveBeenCalledOnce();
    });

    it("keeps the root opaque when the cloud marker has no usable resume material", async () => {
        mockResumePersistedCloudDeletion.mockReturnValue(
            Effect.fail(new Error("Cloud deletion recovery requires reauthentication"))
        );
        mockRecover.mockReturnValue(recovering());
        const { getByText, queryByText } = renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("Cloud deletion recovery requires reauthentication")).toBeTruthy());
        expect(queryByText("ledger")).toBeNull();
    });
});
