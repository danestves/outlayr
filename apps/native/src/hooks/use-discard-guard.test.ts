// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { Alert } from "react-native";
import type { AlertButton } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useDiscardGuard } from "./use-discard-guard";

type Prevented = (options: { data: { action: { type: string } }; repeat: () => void }) => void;

const mockBack = vi.fn();
const mockDisablePrevention = vi.fn();
const mockPreventRemove = vi.fn<(prevent: boolean, callback: Prevented) => void>();

vi.mock("expo-router", () => ({
    usePreventRemove: (prevent: boolean, callback: Prevented) => {
        mockPreventRemove(prevent, callback);
        return mockDisablePrevention;
    },
    useRouter: () => ({ back: mockBack }),
}));
vi.mock("@/i18n/context", () => ({ useTranslation: () => (key: string) => key }));

const ACTION = { type: "GO_BACK" };

function lastGuard(): { callback: Prevented; prevent: boolean } {
    const [prevent, callback] = mockPreventRemove.mock.calls.at(-1) ?? [false, () => undefined];
    return { callback, prevent };
}

describe("useDiscardGuard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("asks before dropping an edit and leaves only on Discard", async () => {
        const alert = vi.spyOn(Alert, "alert").mockReturnValue(undefined);
        const repeat = vi.fn();
        const { result } = await renderHook(() => useDiscardGuard());

        await act(async () => {
            result.current.setDirty(true);
        });
        expect(lastGuard().prevent).toBe(true);

        lastGuard().callback({ data: { action: ACTION }, repeat });
        expect(repeat).not.toHaveBeenCalled();

        const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
        await act(async () => {
            buttons.find((button) => button.style === "destructive")?.onPress?.();
        });
        expect(repeat).toHaveBeenCalledOnce();
        expect(lastGuard().prevent).toBe(false);
    });

    it("does not ask when the screen leaves after a save", async () => {
        const alert = vi.spyOn(Alert, "alert").mockReturnValue(undefined);
        const { result } = await renderHook(() => useDiscardGuard());
        await act(async () => {
            result.current.setDirty(true);
        });

        await act(async () => {
            result.current.leave();
        });

        expect(mockDisablePrevention).toHaveBeenCalledOnce();
        expect(mockBack).toHaveBeenCalledOnce();
        expect(mockDisablePrevention.mock.invocationCallOrder[0]).toBeLessThan(mockBack.mock.invocationCallOrder[0]);
        expect(alert).not.toHaveBeenCalled();
    });

    it("leaves once, however many times it is asked to", async () => {
        const { result } = await renderHook(() => useDiscardGuard());

        const calls: boolean[] = [];
        await act(async () => {
            calls.push(result.current.leave(), result.current.leave());
        });

        expect(calls).toStrictEqual([true, false]);
        expect(mockBack).toHaveBeenCalledOnce();
    });
});
