import { Canvas, createPicture, PaintStyle, Picture, Skia } from "@shopify/react-native-skia";
import type { SkPicture } from "@shopify/react-native-skia";
import { useTheme } from "panelui-native/theme";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useReducedMotion, useSharedValue } from "react-native-reanimated";
import { MODE_FRAMES, resolvePreset } from "thinking-orbs/engine";
import type { OrbSize, OrbState } from "thinking-orbs/engine";

import { useAppForeground } from "@/lib/app-state";

const REDUCED_MOTION_T = 0.6;
const FRAME_MS = 1000 / 30;

const noop = () => undefined;

function makeInk() {
    const fill = Skia.Paint();
    const stroke = Skia.Paint();
    fill.setAntiAlias(true);
    stroke.setAntiAlias(true);
    stroke.setStyle(PaintStyle.Stroke);
    return { fill, rgba: new Float32Array(4), stroke };
}

export function ThinkingOrb({ size = 20, state }: { size?: OrbSize; state: OrbState }) {
    const dark = useTheme().theme === "dark";
    const reduced = useReducedMotion();
    const active = useAppForeground();
    const [empty] = useState(() => createPicture(noop));
    const picture = useSharedValue<SkPicture>(empty);
    const [ink] = useState(makeInk);
    const { mode, speed, opts } = resolvePreset(state, size);

    // oxlint-disable-next-line outlayr/react-effect-budget -- drives a requestAnimationFrame loop that records Skia pictures while the orb is mounted and the app is in the foreground
    useEffect(() => {
        const build = MODE_FRAMES[mode];
        const setInk = (paint: typeof ink.fill, white: number, alpha: number) => {
            const clamped = Math.min(1, Math.max(0, white));
            const grey = Math.round((dark ? 1 - clamped : clamped) * 255) / 255;
            ink.rgba[0] = grey;
            ink.rgba[1] = grey;
            ink.rgba[2] = grey;
            ink.rgba[3] = alpha;
            paint.setColor(ink.rgba);
        };
        const record = (seconds: number) => {
            const frame = build(size, seconds, opts);
            picture.set(
                createPicture(
                    (canvas) => {
                        for (const line of frame.lines) {
                            setInk(ink.stroke, line.white, line.a ?? 1);
                            ink.stroke.setStrokeWidth(line.w);
                            canvas.drawLine(line.x1, line.y1, line.x2, line.y2, ink.stroke);
                        }
                        for (const dot of frame.dots) {
                            setInk(ink.fill, dot.white, dot.a ?? 1);
                            canvas.drawCircle(dot.x, dot.y, dot.r, ink.fill);
                        }
                    },
                    { height: size, width: size, x: 0, y: 0 }
                )
            );
        };

        if (reduced) {
            record(REDUCED_MOTION_T);
            return;
        }
        record((performance.now() / 1000) * speed);
        if (!active) {
            return;
        }
        let frameId = 0;
        let drawnAt = 0;
        const loop = (now: number) => {
            if (now - drawnAt >= FRAME_MS) {
                drawnAt = now;
                record((performance.now() / 1000) * speed);
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [active, dark, ink, mode, opts, picture, reduced, size, speed]);

    return (
        <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: size, width: size }}
        >
            <Canvas style={{ height: size, width: size }}>
                <Picture picture={picture} />
            </Canvas>
        </View>
    );
}
