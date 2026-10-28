import { toast } from "panelui-native/components/toast";
import type { ToastOptions } from "panelui-native/components/toast";
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { NoticeSlipProps } from "@/components/notice-slip";

import { notifyFailure, notifySaved } from "./notify";

function shown(options: ToastOptions | string | undefined) {
    const handle = { hide: vi.fn(), id: "toast" };
    const slip = typeof options === "string" ? null : options?.component?.(handle);
    if (!isValidElement<NoticeSlipProps>(slip)) {
        throw new Error("Expected the notice to render a NoticeSlip");
    }
    return { handle, props: slip.props };
}

describe("notifyFailure", () => {
    it("holds an actionable notice longer than one that only has to be read", () => {
        const showSpy = vi.spyOn(toast, "show").mockReturnValue("toast-3");

        notifyFailure({ title: "Read me" });
        notifyFailure({ actionLabel: "Retry", onActionPress: vi.fn(), title: "Act on me" });

        const [plain, actionable] = showSpy.mock.calls.map(([options]) =>
            typeof options === "string" ? 0 : (options.duration ?? 0)
        );
        expect(actionable).toBeGreaterThan(plain);
        showSpy.mockRestore();
    });

    it("can be dismissed with the escape gesture, which a swipe-only toast would not allow", () => {
        const showSpy = vi.spyOn(toast, "show").mockReturnValue("toast-4");

        notifyFailure({ title: "Not saved" });

        const { handle, props } = shown(showSpy.mock.calls[0]?.[0]);
        props.onDismiss?.();
        expect(handle.hide).toHaveBeenCalledOnce();
        showSpy.mockRestore();
    });
});

describe("notifySaved", () => {
    it("runs the action, then dismisses the toast it was pressed on", () => {
        const showSpy = vi.spyOn(toast, "show").mockReturnValue("toast-6");
        const onActionPress = vi.fn();
        const end = {
            customColor: null,
            emoji: null,
            icon: null,
            imageColor: null,
            imageUri: null,
            kind: "asset" as const,
        };

        notifySaved({
            actionLabel: "Add another",
            amount: { label: "Transfer $50.00", text: "$50.00" },
            onActionPress,
            stamp: "Transfer added",
            title: "Mercantil",
            tone: { ends: { from: { ...end, name: "Chase" }, to: { ...end, name: "Mercantil" } }, kind: "transfer" },
        });

        const { handle, props } = shown(showSpy.mock.calls[0]?.[0]);
        props.onAction?.();

        expect(onActionPress).toHaveBeenCalledWith(handle);
        expect(handle.hide).toHaveBeenCalledOnce();
        showSpy.mockRestore();
    });
});
