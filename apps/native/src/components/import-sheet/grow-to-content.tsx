import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Easing, useReducedMotion } from "react-native-reanimated";

const RESIZE_MS = 320;
const ease = Easing.out(Easing.cubic);

// The native sheet sizes itself to its content, so easing this box's height is what makes the sheet
// grow instead of jumping. It steps through React state: the Android sheet only re-measures on a
// commit, and a UI-thread height animation reaches it in a few coarse jumps.
export function GrowToContent({ children, maxHeight }: { children: ReactNode; maxHeight: number }) {
    const reduced = useReducedMotion();
    const [height, setHeight] = useState<number | null>(null);
    const shown = useRef<number | null>(null);
    const frame = useRef(0);

    const resizeTo = (target: number) => {
        cancelAnimationFrame(frame.current);
        const from = shown.current;
        if (from === null || reduced || from === target) {
            shown.current = target;
            setHeight(target);
            return;
        }
        let start: number | null = null;
        const step = (now: number) => {
            if (start === null) {
                start = now;
            }
            const progress = Math.min(1, (now - start) / RESIZE_MS);
            shown.current = from + (target - from) * ease(progress);
            setHeight(shown.current);
            if (progress < 1) {
                frame.current = requestAnimationFrame(step);
            }
        };
        frame.current = requestAnimationFrame(step);
    };

    return (
        <View style={height === null ? { flexShrink: 1 } : { flexShrink: 1, height, overflow: "hidden" }}>
            <View
                onLayout={({ nativeEvent }) => resizeTo(nativeEvent.layout.height)}
                style={height === null ? { maxHeight } : { left: 0, maxHeight, position: "absolute", right: 0, top: 0 }}
            >
                {children}
            </View>
        </View>
    );
}
