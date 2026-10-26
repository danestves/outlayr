import { useEffect, useRef } from "react";
import { Easing, useAnimatedReaction, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";

import { CHART_DRAW } from "@/theme/chart";

const TIMING = { duration: CHART_DRAW.durationMs, easing: Easing.out(Easing.cubic) };

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

interface Morph {
    from: number[];
    gaps: string[];
    to: number[];
}

export function useChartDraw(animated: boolean, value = 1, from = 0, pointCount?: number) {
    const draw = useSharedValue(animated ? from : value);

    useAnimatedReaction(
        () => ({ animated, pointCount, value }),
        (next, previous) => {
            const recounted = previous !== null && previous.pointCount !== next.pointCount;
            draw.set(next.animated && !recounted ? withTiming(next.value, TIMING) : next.value);
        }
    );

    return draw;
}

function morphBetween(from: string, to: string): Morph | null {
    const gaps = to.split(NUMBER);
    const fromGaps = from.split(NUMBER);
    if (from === to || fromGaps.length !== gaps.length || fromGaps.some((gap, index) => gap !== gaps[index])) {
        return null;
    }
    return {
        from: (from.match(NUMBER) ?? []).map(Number),
        gaps,
        to: (to.match(NUMBER) ?? []).map(Number),
    };
}

function tween({ from, gaps, to }: Morph, progress: number): string {
    "worklet";
    let [path] = gaps;
    for (const [index, end] of to.entries()) {
        path += `${from[index] + (end - from[index]) * progress}${gaps[index + 1]}`;
    }
    return path;
}

export function useChartPath(path: string, animated: boolean, pointCount?: number) {
    const transition = useSharedValue<{ morph: Morph | null; path: string }>({ morph: null, path });
    const progress = useSharedValue(1);
    const shown = useDerivedValue(() => {
        const { morph, path: settled } = transition.get();
        const at = progress.get();
        return morph && at < 1 ? tween(morph, at) : settled;
    });

    const handed = useRef(path);
    const handedPointCount = useRef(pointCount);

    // oxlint-disable-next-line outlayr/react-effect-budget -- hands a new path to the Reanimated progress value, which reads the path being shown at that moment
    useEffect(() => {
        const recounted = handedPointCount.current !== pointCount;
        handedPointCount.current = pointCount;
        if (animated && handed.current === path) {
            return;
        }
        handed.current = path;
        const morph = animated && !recounted ? morphBetween(shown.get(), path) : null;
        transition.set({ morph, path });
        progress.set(morph ? 0 : 1);
        if (morph) {
            progress.set(withTiming(1, TIMING));
        }
    }, [animated, path, progress, pointCount, transition, shown]);

    return shown;
}
