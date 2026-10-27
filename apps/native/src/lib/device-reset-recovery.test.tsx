import { useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { ReactNode } from "react";
import { Text } from "react-native";

import { localDataAtom } from "@/contexts/local-data-context";
import { testLocalData as mockTestLocalData } from "@/contexts/test-local-data";
import { unusedDatabase as mockUnusedDatabase } from "@/db/test-database";

import { DeviceResetRecovery } from "./device-reset-recovery";
import { appRuntime } from "./runtime";

const mockRecover = jest.fn<() => Effect.Effect<{ failures: string[] }, unknown>>();
const mockResumePersistedCloudDeletion =
    jest.fn<(options?: { clearOnComplete?: boolean; required?: boolean }) => Effect.Effect<boolean, unknown>>();
let mockCompleteCloudDeletion: Effect.Effect<void, unknown> | undefined;
let mockCloseDatabase: Effect.Effect<void, unknown> | undefined;
const mockDatabase = mockUnusedDatabase();
const mockLocalDataReads = jest.fn();
jest.mock("@/contexts/local-data-context", () => {
    const { make } = jest.requireActual<typeof import("effect/reactivity/Atom")>("effect/reactivity/Atom");
    return {
        localDataAtom: make(() => {
            mockLocalDataReads();
            return null;
        }),
        useLocalData: () => mockTestLocalData({ db: mockDatabase }),
    };
});
jest.mock("@/db/client", () => ({
    closeDatabase: () => jest.requireActual<typeof import("effect/Effect")>("effect/Effect").void,
}));
jest.mock("./deletion-resume", () => ({
    DeletionResumeError:
        jest.requireActual<typeof import("./deletion-resume")>("./deletion-resume").DeletionResumeError,
    resumePersistedCloudDeletion: (...args: Parameters<typeof mockResumePersistedCloudDeletion>) =>
        mockResumePersistedCloudDeletion(...args),
}));
jest.mock("./device-data-reset", () => ({
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
        const { getByText } = await renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(mockRecover).toHaveBeenCalledTimes(1));
        expect(mockResumePersistedCloudDeletion).toHaveBeenCalledWith({ clearOnComplete: false, required: true });
        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
    });

    it("discloses a failed recovery and retries it before rendering the ledger", async () => {
        mockResumePersistedCloudDeletion
            .mockReturnValueOnce(Effect.fail(new Error("network unavailable")))
            .mockReturnValueOnce(Effect.succeed(true));
        mockRecover.mockReturnValue(recovering());
        const { getByRole, getByText, queryByText } = await renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("settings.account.resetFailedTitle")).toBeTruthy());
        expect(queryByText("ledger")).toBeNull();
        await act(async () => {
            fireEvent.press(getByRole("button", { name: "common.retry" }));
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
        const { getByText } = await renderRecovery(
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
        const { getByText } = await renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("ledger")).toBeTruthy());
        expect(mockLocalDataReads).toHaveBeenCalledTimes(1);
    });

    it("leaves the database closed when a store failed, rather than reopening onto a half-erased device", async () => {
        mockRecover.mockReturnValue(recovering(["photos"], true));
        const { getByText } = await renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );

        await waitFor(() => expect(getByText("Device cleanup incomplete: photos")).toBeTruthy());
        expect(mockLocalDataReads).toHaveBeenCalledTimes(1);
    });

    it("keeps the root opaque when the cloud marker has no usable resume material", async () => {
        mockResumePersistedCloudDeletion.mockReturnValue(
            Effect.fail(new Error("Cloud deletion recovery requires reauthentication"))
        );
        mockRecover.mockReturnValue(recovering());
        const { getByText, queryByText } = await renderRecovery(
            <DeviceResetRecovery>
                <Text>ledger</Text>
            </DeviceResetRecovery>
        );
        await waitFor(() => expect(getByText("Cloud deletion recovery requires reauthentication")).toBeTruthy());
        expect(queryByText("ledger")).toBeNull();
    });
});
