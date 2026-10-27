import { describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as Effect from "effect/Effect";

import { launchPick } from "@/lib/pending-pick";

import { useReceiptScan } from "./use-receipt-scan";

jest.mock<Partial<typeof import("@react-native-async-storage/async-storage")>>(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock<Partial<typeof import("expo-image-picker")>>("expo-image-picker", () => ({
    ...jest.requireActual<typeof import("expo-image-picker")>("expo-image-picker"),
    getPendingResultAsync: async () => ({
        assets: [{ height: 4000, uri: "file:///cache/pending.jpg", width: 3000 }],
        canceled: false,
    }),
}));
jest.mock<Partial<typeof import("@/lib/receipt-image")>>("@/lib/receipt-image", () => ({
    prepareReceiptImage: () => jest.requireActual<typeof import("effect/Effect")>("effect/Effect").never,
}));
jest.mock<Partial<typeof import("@/lib/convex")>>("@/lib/convex", () => ({
    receiptScanTransport: () => () =>
        jest.requireActual<typeof import("effect/Effect")>("effect/Effect").succeed({ receipt: null, status: "ok" }),
}));

describe("useReceiptScan on Android", () => {
    it("reads the photo the camera finished for scan after Android tore the app down", async () => {
        let launched: () => void = () => undefined;
        const started = new Promise<void>((resolve) => {
            launched = resolve;
        });
        Effect.runFork(launchPick("receipt-scan", Effect.sync(launched).pipe(Effect.andThen(Effect.never))));
        await started;

        const { result } = await renderHook(() =>
            useReceiptScan({
                context: null,
                request: { accounts: [], categoryTree: [], currency: "USD" },
            })
        );

        await waitFor(() => {
            expect(result.current.phase).toStrictEqual({
                kind: "scanning",
                photo: { height: 4000, uri: "file:///cache/pending.jpg", width: 3000 },
            });
        });
    });
});
