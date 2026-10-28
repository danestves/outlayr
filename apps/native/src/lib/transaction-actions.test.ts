import { Alert } from "react-native";
import { describe, expect, it, vi } from "vite-plus/test";

import type { TransactionRowActions } from "@/domain/transaction-actions";
import type { TranslateFn } from "@/i18n/context";

import { transactionMenuItems } from "./transaction-actions";

const t: TranslateFn = (key) => key;

const ALL_ALLOWED: TransactionRowActions = { canDelete: true, canLogAgain: true, canStopRecurring: true };

function items(actions: TransactionRowActions, overrides: Partial<Parameters<typeof transactionMenuItems>[0]> = {}) {
    return transactionMenuItems({
        actions,
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onLogAgain: vi.fn(),
        onStopRecurring: vi.fn(),
        t,
        ...overrides,
    });
}

describe("transactionMenuItems", () => {
    it("orders the whole menu with Edit before the destructive Delete", () => {
        expect(items(ALL_ALLOWED).map((item) => item.id)).toStrictEqual([
            "logAgain",
            "stopRecurring",
            "edit",
            "delete",
        ]);
    });

    it("leaves only Edit when every guard is closed", () => {
        const guarded: TransactionRowActions = { canDelete: false, canLogAgain: false, canStopRecurring: false };
        expect(items(guarded).map((item) => item.id)).toStrictEqual(["edit"]);
    });

    it("deletes outright, because the undo window is the confirmation", () => {
        const onDelete = vi.fn();
        const alertSpy = vi.spyOn(Alert, "alert").mockImplementation(() => {});

        items(ALL_ALLOWED, { onDelete })
            .find((item) => item.id === "delete")
            ?.onPress();

        expect(onDelete).toHaveBeenCalledOnce();
        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it("stops a schedule outright too — that write is held for the same window", () => {
        const onStopRecurring = vi.fn();
        const alertSpy = vi.spyOn(Alert, "alert").mockImplementation(() => {});

        items(ALL_ALLOWED, { onStopRecurring })
            .find((item) => item.id === "stopRecurring")
            ?.onPress();

        expect(onStopRecurring).toHaveBeenCalledOnce();
        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});
