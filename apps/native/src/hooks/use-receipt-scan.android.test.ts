// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { launchPick } from "@/lib/pending-pick";

import { useReceiptScan } from "./use-receipt-scan";

vi.mock("@expo/ui/jetpack-compose", () => ({ isDynamicColorAvailable: () => false }));
vi.mock("@react-native-async-storage/async-storage", () => {
    const storage = new Map<string, string>();
    return {
        default: {
            getItem: async (key: string) => storage.get(key) ?? null,
            removeItem: async (key: string) => {
                storage.delete(key);
            },
            setItem: async (key: string, value: string) => {
                storage.set(key, value);
            },
        },
    };
});
vi.mock<Partial<typeof import("expo-image-picker")>>(import("expo-image-picker"), async (importOriginal) => ({
    ...(await importOriginal<typeof import("expo-image-picker")>()),
    getPendingResultAsync: async () => ({
        assets: [{ height: 4000, uri: "file:///cache/pending.jpg", width: 3000 }],
        canceled: false,
    }),
}));
vi.mock<Partial<typeof import("@/state/entry-commands")>>(import("@/state/entry-commands"), async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/state/entry-commands")>();
    return { ...actual, entryMedia: { ...actual.entryMedia, prepareReceiptImage: () => Effect.never } };
});
vi.mock<Partial<typeof import("@/lib/cloud-ai")>>(import("@/lib/cloud-ai"), async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/cloud-ai")>()),
    receiptScanTransport: () => () => Effect.succeed({ ok: false, reason: "invalidResponse" }),
}));

describe("useReceiptScan on Android", () => {
    it("reads the photo the camera finished for scan after Android tore the app down", async () => {
        let launched: () => void = () => undefined;
        const started = new Promise<void>((resolve) => {
            launched = resolve;
        });
        Effect.runFork(launchPick("receipt-scan", Effect.sync(launched).pipe(Effect.andThen(Effect.never))));
        await started;

        const { result } = renderHook(() =>
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
