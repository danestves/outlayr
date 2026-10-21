import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";
import type { AlertButton } from "react-native";

import type { SwipeDiscardRecovery } from "./use-discard-guard";
import { useDiscardGuard } from "./use-discard-guard.android";

type Prevented = (options: { data: { action: { type: string } }; repeat: () => void }) => void;
interface DetentEvent {
    data: { index: number; stable: boolean };
}

const mockPreventRemove = jest.fn<(prevent: boolean, callback: Prevented) => void>();
const mockNotifyEditsDiscarded = jest.fn<(onUndo: () => void) => void>();
const mockGuardAtPop: boolean[] = [];
const mockSheetListener: { current: ((event: DetentEvent) => void) | null } = { current: null };

function mockLastGuard(): { callback: Prevented; prevent: boolean } {
    const [prevent, callback] = mockPreventRemove.mock.calls.at(-1) ?? [false, () => undefined];
    return { callback, prevent };
}

jest.mock("expo-router", () => ({
    usePreventRemove: (prevent: boolean, callback: Prevented) => {
        mockPreventRemove(prevent, callback);
        return () => undefined;
    },
    useNavigation: () => ({
        addListener: (_event: "sheetDetentChange", listener: (event: DetentEvent) => void) => {
            mockSheetListener.current = listener;
            return () => undefined;
        },
    }),
    useRouter: () => ({ back: () => mockGuardAtPop.push(mockLastGuard().prevent) }),
}));
jest.mock("@/i18n/context", () => ({ useTranslation: () => (key: string) => key }));
jest.mock("@/components/edits-discarded-snackbar", () => ({
    notifyEditsDiscarded: (onUndo: () => void) => mockNotifyEditsDiscarded(onUndo),
}));

const DRAGGING = { data: { index: 0, stable: false } };
const SETTLED = { data: { index: 0, stable: true } };
const HIDDEN = { data: { index: -1, stable: true } };

async function sheet(...events: DetentEvent[]) {
    for (const event of events) {
        await act(async () => {
            mockSheetListener.current?.(event);
        });
    }
}

async function dirtyGuard(recovery?: SwipeDiscardRecovery<string>) {
    const hook = await renderHook(() => useDiscardGuard(recovery));
    await act(async () => {
        hook.result.current.setDirty(true);
    });
    return hook;
}

describe("useDiscardGuard on Android", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGuardAtPop.length = 0;
        mockSheetListener.current = null;
    });

    it("leaves once, however many times it is asked to", async () => {
        const { result } = await dirtyGuard();

        const calls: boolean[] = [];
        await act(async () => {
            calls.push(result.current.leave());
        });
        await act(async () => {
            calls.push(result.current.leave());
        });

        expect(calls).toStrictEqual([true, false]);
        expect(mockGuardAtPop).toStrictEqual([false]);
    });

    it.each(["POP"])("asks on %s and leaves on Discard once the lowered guard has rendered", async (type) => {
        // POP is a full-screen dialog's app-bar X: it is not a swipe.
        const alert = jest.spyOn(Alert, "alert").mockReturnValue(undefined);
        const repeat = jest.fn(() => mockGuardAtPop.push(mockLastGuard().prevent));
        await dirtyGuard();

        mockLastGuard().callback({ data: { action: { type } }, repeat });
        expect(repeat).not.toHaveBeenCalled();
        expect(alert.mock.calls[0]?.[3]).toStrictEqual({ cancelable: true });
        const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
        await act(async () => {
            buttons.find((button) => button.style === "destructive")?.onPress?.();
        });

        expect(repeat).toHaveBeenCalledTimes(1);
        expect(mockGuardAtPop).toStrictEqual([false]);
    });

    it("lets a sheet that reported itself hidden go without asking", async () => {
        const alert = jest.spyOn(Alert, "alert").mockReturnValue(undefined);
        const repeat = jest.fn();
        await dirtyGuard();

        await sheet(HIDDEN);
        await act(async () => {
            mockLastGuard().callback({ data: { action: { type: "POP" } }, repeat });
        });

        expect(alert).not.toHaveBeenCalled();
        expect(repeat).toHaveBeenCalledTimes(1);
    });

    it("stands down while the sheet is dragged and comes back when it settles", async () => {
        await dirtyGuard();
        expect(mockLastGuard().prevent).toBe(true);

        await sheet(DRAGGING);
        expect(mockLastGuard().prevent).toBe(false);

        await sheet(SETTLED);
        expect(mockLastGuard().prevent).toBe(true);
    });

    it("offers a swiped-away sheet's edits back, and Undo restores them", async () => {
        const restore = jest.fn<(draft: string) => void>();
        await dirtyGuard({ restore, snapshot: () => "amount 12" });

        await sheet(DRAGGING, HIDDEN);

        expect(mockNotifyEditsDiscarded).toHaveBeenCalledTimes(1);
        mockNotifyEditsDiscarded.mock.calls[0]?.[0]();
        expect(restore).toHaveBeenCalledWith("amount 12");
    });

    it("offers nothing for a clean swipe or a drag that settles back", async () => {
        const snapshot = jest.fn(() => "amount 12");
        const recovery = { restore: jest.fn(), snapshot };
        const clean = await renderHook(() => useDiscardGuard(recovery));
        await sheet(DRAGGING, HIDDEN);
        clean.unmount();

        const { result } = await dirtyGuard(recovery);
        await sheet(DRAGGING, SETTLED);
        await act(async () => {
            result.current.leave();
        });

        expect(snapshot).not.toHaveBeenCalled();
        expect(mockNotifyEditsDiscarded).not.toHaveBeenCalled();
    });
});
