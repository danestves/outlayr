import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { View } from "react-native";
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { blendProfile, SHARED_UNIFORMS } from "./orb-profile";
import { ORB_SKSL } from "./orb-shader";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "settled" | "failed";

// Module scope: compiling SkSL is far too slow for a render, and the React Compiler would read the capitalized
// `RuntimeEffect.Make` call as a component.
const ORB_EFFECT = Skia.RuntimeEffect.Make(ORB_SKSL);

const ATTACK = 14;
const RELEASE = 3.2;
const LISTENING_FLOOR = 0.3;
const LISTENING_RANGE = 0.7;
const SETTLED_ACTIVATION = 0.42;
/** A frame this long is a hitch; playing it back at full rate is a lurch. */
const MAX_FRAME_MS = 48;
const STILL_PHASE = 2.4;

function targetActivation(state: VoiceOrbState, level: number, phase: number): number {
    "worklet";
    if (state === "listening") {
        return LISTENING_FLOOR + LISTENING_RANGE * Math.min(1, Math.max(0, level));
    }
    if (state === "thinking") {
        // Two tempi, so the pulse never lands on a beat and reads as work rather than progress.
        return 0.62 + 0.22 * Math.sin(phase * 3.1) + 0.12 * Math.sin(phase * 5.3 + 1.1);
    }
    if (state === "settled") {
        return SETTLED_ACTIVATION;
    }
    return 0;
}

interface VoiceOrbProps {
    /** 0 to 1, from the recorder's metering. Read on the UI thread only. */
    level?: SharedValue<number>;
    size: number;
    state: VoiceOrbState;
}

// Uniforms come from two UI-thread accumulators, so a 60Hz meter never re-renders React. Phase accumulates rather
// than deriving from wall time: tempo follows activation, and `time * speed` would jump on every speed change.
export function VoiceOrb({ level, size, state }: VoiceOrbProps) {
    const reducedMotion = useReducedMotion();
    const phase = useSharedValue(STILL_PHASE);
    const activation = useSharedValue(0);
    const stateValue = useSharedValue<VoiceOrbState>(state);

    useEffect(() => {
        stateValue.set(state);
    }, [state, stateValue]);

    const frame = useFrameCallback((info) => {
        "worklet";
        const delta = Math.min(info.timeSincePreviousFrame ?? 16, MAX_FRAME_MS) / 1000;
        const current = activation.get();
        const target = targetActivation(stateValue.get(), level?.get() ?? 0, phase.get());
        const rate = target > current ? ATTACK : RELEASE;
        const next = current + (target - current) * Math.min(1, delta * rate);
        activation.set(next);
        phase.set(phase.get() + delta * blendProfile(next).speed);
    }, false);

    const { setActive } = frame;
    useEffect(() => {
        setActive(!reducedMotion);
        return () => setActive(false);
    }, [reducedMotion, setActive]);

    useEffect(() => {
        if (!reducedMotion) {
            return;
        }
        activation.set(targetActivation(state, 0.5, STILL_PHASE));
    }, [reducedMotion, state, activation]);

    const uniforms = useDerivedValue(() => {
        const profile = blendProfile(activation.get());
        return {
            ...SHARED_UNIFORMS,
            colorA: profile.colorA,
            colorB: profile.colorB,
            colorC: profile.colorC,
            colorD: profile.colorD,
            contourDeform: profile.contourDeform,
            exposure: profile.exposure,
            glowColor: profile.glowColor,
            highlightColor: profile.highlightColor,
            iResolution: [size, size],
            ridgeAmt: profile.ridgeAmt,
            speed: 1,
            time: phase.get(),
            warp: profile.warp,
            zoom: profile.zoom,
        };
    });

    if (ORB_EFFECT === null) {
        return <View style={{ height: size, width: size }} />;
    }

    return (
        <Canvas style={{ height: size, width: size }}>
            <Fill>
                <Shader source={ORB_EFFECT} uniforms={uniforms} />
            </Fill>
        </Canvas>
    );
}
