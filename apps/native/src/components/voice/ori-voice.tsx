import { Canvas, Group, Image, rect, useImage } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { View } from "react-native";
import {
    useDerivedValue,
    useFrameCallback,
    useReducedMotion,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import oriDark from "@/assets/images/ori/voice-dark.webp";
import oriLight from "@/assets/images/ori/voice-light.webp";
import { useIsDark } from "@/theme/use-is-dark";

export type OriState = "idle" | "listening" | "thinking" | "settled" | "failed";

const COLUMNS = 8;
const ROWS = 6;
const LISTEN = 0;
const LISTEN_STEPS = 7;
const BLINK_OFFSET = 8;
const THINK = 16;
const THINK_FRAMES = 6;
const LIT = 22;
const LIT_FRAMES = 4;
const HAPPY = 26;
const HAPPY_FRAMES = 14;
const WORRIED = 40;

const THINK_FRAME_MS = 100;
const LIT_FRAME_MS = 1000 / 12;
const LIT_MS = LIT_FRAMES * LIT_FRAME_MS;
export const ORI_GOT_IT_MS = LIT_MS;
const HAPPY_FRAME_MS = 1000 / 30;
const SETTLE_MS = LIT_MS + HAPPY_FRAMES * HAPPY_FRAME_MS;
const BLINK_MS = 110;
const BLINK_GAP_MS = 2400;
const BLINK_JITTER_MS = 1200;
const ATTACK_MS = 60;
const RELEASE_MS = 180;
const MAX_FRAME_MS = 48;
// The mic stands to her right, so her body sits left of the cell centre. Without the mic she is nudged back.
const BODY_SHIFT = 0.056;
const SHIFT_SPRING = { damping: 20, stiffness: 180 };

const STILL_CELL: Record<OriState, number> = {
    failed: WORRIED,
    idle: LISTEN,
    listening: LISTEN + 3,
    settled: HAPPY + HAPPY_FRAMES - 1,
    thinking: THINK + 3,
};

function settleCell(clock: number): number {
    "worklet";
    if (clock < LIT_MS) {
        return LIT + Math.floor(clock / LIT_FRAME_MS);
    }
    return HAPPY + Math.min(HAPPY_FRAMES - 1, Math.floor((clock - LIT_MS) / HAPPY_FRAME_MS));
}

function thinkCell(clock: number): number {
    "worklet";
    const cycle = 2 * THINK_FRAMES - 2;
    const step = Math.floor(clock / THINK_FRAME_MS) % cycle;
    return THINK + (step < THINK_FRAMES ? step : cycle - step);
}

interface OriVoiceProps {
    /** 0 to 1, from the recorder's metering. Read on the UI thread only. */
    level?: SharedValue<number>;
    size: number;
    state: OriState;
}

// Pre-rendered frames in one atlas, picked on the UI thread so a 60Hz meter never re-renders React. Ori listens
// rather than lip-syncs: the level picks how far she leans in, and the canvas only repaints when the cell changes.
export function OriVoice({ level, size, state }: OriVoiceProps) {
    const atlas = useImage(useIsDark() ? oriDark : oriLight);
    const reducedMotion = useReducedMotion();
    const stateValue = useDerivedValue(() => state);
    const seen = useSharedValue<OriState | null>(null);
    const clock = useSharedValue(0);
    const blinkIn = useSharedValue(BLINK_GAP_MS);
    const heard = useSharedValue(0);
    const cell = useSharedValue(STILL_CELL[state]);

    const frame = useFrameCallback((info) => {
        "worklet";
        const delta = Math.min(info.timeSincePreviousFrame ?? 16, MAX_FRAME_MS);
        const current = stateValue.get();
        if (seen.get() !== current) {
            seen.set(current);
            clock.set(0);
        }
        clock.set(clock.get() + delta);
        blinkIn.set(blinkIn.get() - delta);
        if (blinkIn.get() < -BLINK_MS) {
            blinkIn.set(BLINK_GAP_MS + Math.random() * BLINK_JITTER_MS);
        }
        const blink = blinkIn.get() < 0 ? 1 : 0;

        let next = LISTEN + blink * BLINK_OFFSET;
        if (current === "settled") {
            next = settleCell(clock.get());
        } else if (current === "thinking") {
            next = thinkCell(clock.get());
        } else if (current === "failed") {
            next = WORRIED + blink;
        } else if (current === "listening") {
            const target = Math.min(1, Math.max(0, level?.get() ?? 0));
            const smoothed = heard.get();
            const tau = target > smoothed ? ATTACK_MS : RELEASE_MS;
            heard.set(smoothed + (target - smoothed) * (1 - Math.exp(-delta / tau)));
            next = LISTEN + Math.round(heard.get() * LISTEN_STEPS) + blink * BLINK_OFFSET;
        }
        if (next !== cell.get()) {
            cell.set(next);
        }
    }, false);

    const { setActive } = frame;
    // oxlint-disable-next-line outlayr/react-effect-budget -- runs the frame callback only while Ori moves: never under Reduced Motion, and not past the settle hop
    useEffect(() => {
        if (reducedMotion) {
            cell.set(STILL_CELL[state]);
            return;
        }
        setActive(true);
        if (state !== "settled") {
            return () => setActive(false);
        }
        const rest = setTimeout(() => setActive(false), SETTLE_MS + 50);
        return () => {
            clearTimeout(rest);
            setActive(false);
        };
    }, [cell, reducedMotion, setActive, state]);

    const withMic = state === "idle" || state === "listening";
    const shift = useDerivedValue(() => {
        const target = withMic ? 0 : BODY_SHIFT * size;
        return reducedMotion ? target : withSpring(target, SHIFT_SPRING);
    });
    const x = useDerivedValue(() => shift.get() - (cell.get() % COLUMNS) * size);
    const y = useDerivedValue(() => -Math.floor(cell.get() / COLUMNS) * size);

    if (atlas === null) {
        return <View style={{ height: size, width: size }} />;
    }

    return (
        <Canvas style={{ height: size, width: size }}>
            <Group clip={rect(0, 0, size, size)}>
                <Image fit="fill" height={size * ROWS} image={atlas} width={size * COLUMNS} x={x} y={y} />
            </Group>
        </Canvas>
    );
}
