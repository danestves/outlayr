import { useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance, ViewInstance } from "react-native";

import { useTimers } from "@/lib/lifecycle";

import { measureInWindow } from "./measure";

const REVEAL_AT = 0.35;
const SETTLE_FRAMES = 2;
const MIN_DELTA = 8;

export function useTourScrollReveal() {
    const timers = useTimers();
    const scrollRef = useRef<ScrollViewInstance>(null);
    const offset = useRef(0);

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = event.nativeEvent.contentOffset.y;
    };

    const settle = () =>
        new Promise<void>((resolve) => {
            let frames = 0;
            const next = () => {
                frames += 1;
                if (frames >= SETTLE_FRAMES) {
                    resolve();
                    return;
                }
                timers.frame(next);
            };
            timers.frame(next);
        });

    const reveal = async (node: ViewInstance) => {
        const scroll = scrollRef.current;
        if (!scroll) {
            return;
        }
        const viewport = await measureInWindow(scroll);
        const target = await measureInWindow(node);
        if (!viewport || !target) {
            return;
        }
        // A scroll that lands before the frame settles would be measured at the old offset.
        const delta = target.y - (viewport.y + viewport.height * REVEAL_AT);
        if (Math.abs(delta) < MIN_DELTA) {
            return;
        }
        scroll.scrollTo({ animated: false, y: Math.max(0, offset.current + delta) });
        await settle();
    };

    return { onScroll, reveal, scrollRef };
}
