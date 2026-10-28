// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { CHART_DRAW } from "@/theme/chart";

import { useChartDraw, useChartPath } from "./use-chart-draw";

const FROM = "M 0 10 L 20 -4 Z";
const TO = "M 0 30 L 60 8 Z";
const FRAME_MS = 16;

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

async function morph(to: string, animated: boolean, pointCounts: [number, number] = [1, 1]) {
    const hook = renderHook(
        ({ path, pointCount }: { path: string; pointCount: number }) => useChartPath(path, animated, pointCount),
        { initialProps: { path: FROM, pointCount: pointCounts[0] } }
    );
    hook.rerender({ path: to, pointCount: pointCounts[1] });
    return hook.result;
}

describe("useChartPath", () => {
    it("eases between two paths with the same commands and settles on the new one exactly", async () => {
        const result = await morph(TO, true);

        await act(async () => {
            vi.advanceTimersByTime(CHART_DRAW.durationMs / 3);
        });
        const midway = result.current.get();
        expect(midway).not.toBe(FROM);
        expect(midway).not.toBe(TO);
        expect(midway.replaceAll(/[\d.e-]+/g, "#")).toBe("M # # L # # Z");

        await act(async () => {
            vi.advanceTimersByTime(CHART_DRAW.durationMs);
        });
        expect(result.current.get()).toBe(TO);
    });

    it.each<[string, string, boolean, [number, number]]>([
        ["the path's commands change", "M 0 30 L 60 8 L 70 2 Z", true, [1, 1]],
        ["charts do not animate", TO, false, [1, 1]],
        ["its point count changes", TO, true, [7, 30]],
    ])("swaps at once when %s", async (_, to, animated, pointCounts) => {
        const result = await morph(to, animated, pointCounts);

        await act(async () => {
            vi.advanceTimersByTime(FRAME_MS);
        });
        expect(result.current.get()).toBe(to);
    });
});

describe("useChartDraw", () => {
    it("jumps to a new value when its point count changes", async () => {
        const hook = renderHook(
            ({ value, pointCount }: { value: number; pointCount: number }) =>
                useChartDraw(true, value, value, pointCount),
            {
                initialProps: { pointCount: 7, value: 40 },
            }
        );
        hook.rerender({ pointCount: 30, value: 120 });

        await act(async () => {
            vi.advanceTimersByTime(FRAME_MS);
        });
        expect(hook.result.current.get()).toBe(120);
    });
});
