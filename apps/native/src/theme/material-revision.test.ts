// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { applyMaterialScheme, useMaterialRevision } from "./material-revision";

describe("applyMaterialScheme", () => {
    it("writes a scheme once, however often it is handed back", () => {
        const write = vi.fn();
        applyMaterialScheme("tonal green", write);
        applyMaterialScheme("tonal green", write);
        applyMaterialScheme("tonal green", write);
        expect(write).toHaveBeenCalledOnce();

        applyMaterialScheme("tonal blue", write);
        expect(write).toHaveBeenCalledTimes(2);
    });

    it("tries again next time when a write throws", () => {
        expect(() => {
            applyMaterialScheme("tonal pink", () => {
                throw new Error("native module gone");
            });
        }).toThrow("native module gone");
        const write = vi.fn();
        applyMaterialScheme("tonal pink", write);
        expect(write).toHaveBeenCalledOnce();
    });
});

describe("useMaterialRevision", () => {
    it("moves when a new scheme is applied, and only then", async () => {
        applyMaterialScheme("seeded vermilion", () => undefined);
        const { result } = await renderHook(() => useMaterialRevision());
        const first = result.current;

        await act(() => {
            applyMaterialScheme("seeded vermilion", () => undefined);
        });
        expect(result.current).toBe(first);

        await act(() => {
            applyMaterialScheme("seeded prussian", () => undefined);
        });
        expect(result.current).toBe(first + 1);
    });
});
