import { Canvas, DashPathEffect, Path, RoundedRect, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { withAlpha } from "@/theme/shade";

/** Slow enough to read as a resting pulse, not a loader. */
const BREATH_MS = 2200;
const BREATH_SCALE = 1.035;
const PAPER_INSET = 22;
const PAPER_RADIUS = 6;
const TOOTH_WIDTH = 10;
const TOOTH_HEIGHT = 6;
const BRACKET_ARM = 26;
const BRACKET_STROKE = 2.5;
const BRACKET_RADIUS = 14;
const LINE_HEIGHT = 5;
const LINE_GAP = 13;
const LINE_INSET = 16;

interface ReceiptFrameProps {
    paper: string;
    ink: string;
    tint: string;
    height: number;
    width: number;
}

function paperPath(width: number, height: number) {
    const left = PAPER_INSET;
    const right = width - PAPER_INSET;
    const top = PAPER_INSET;
    const bottom = height - PAPER_INSET;
    const path = Skia.PathBuilder.Make();
    path.moveTo(left, top + PAPER_RADIUS);
    path.quadTo(left, top, left + PAPER_RADIUS, top);
    path.lineTo(right - PAPER_RADIUS, top);
    path.quadTo(right, top, right, top + PAPER_RADIUS);
    path.lineTo(right, bottom - TOOTH_HEIGHT);
    // Right to left, so the path closes upward.
    const teeth = Math.max(1, Math.floor((right - left) / TOOTH_WIDTH));
    const toothWidth = (right - left) / teeth;
    for (let index = 0; index < teeth; index += 1) {
        const x = right - toothWidth * (index + 0.5);
        path.lineTo(x, bottom);
        path.lineTo(right - toothWidth * (index + 1), bottom - TOOTH_HEIGHT);
    }
    path.close();
    return path.detach();
}

function bracketsPath(width: number, height: number) {
    const path = Skia.PathBuilder.Make();
    const inset = BRACKET_STROKE / 2;
    const corners = [
        { sx: 1, sy: 1, x: inset, y: inset },
        { sx: -1, sy: 1, x: width - inset, y: inset },
        { sx: 1, sy: -1, x: inset, y: height - inset },
        { sx: -1, sy: -1, x: width - inset, y: height - inset },
    ];
    for (const corner of corners) {
        const { sx, sy, x, y } = corner;
        path.moveTo(x, y + sy * BRACKET_ARM);
        path.lineTo(x, y + sy * BRACKET_RADIUS);
        path.quadTo(x, y, x + sx * BRACKET_RADIUS, y);
        path.lineTo(x + sx * BRACKET_ARM, y);
    }
    return path.detach();
}

export function ReceiptFrame({ height, ink, paper, tint, width }: ReceiptFrameProps) {
    const reducedMotion = useReducedMotion();
    const breath = useSharedValue(0);

    useEffect(() => {
        if (reducedMotion) {
            breath.set(0);
            return;
        }
        breath.set(withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
        return () => {
            cancelAnimation(breath);
        };
    }, [breath, reducedMotion]);

    const bracketStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + (BREATH_SCALE - 1) * breath.get() }],
    }));

    const paper_ = paperPath(width, height);
    const brackets = bracketsPath(width, height);
    const left = PAPER_INSET + LINE_INSET;
    const right = width - PAPER_INSET - LINE_INSET;
    const lineWidth = right - left;
    const firstLine = PAPER_INSET + LINE_INSET + 4;
    const lines = [
        { w: lineWidth * 0.55, x: left + (lineWidth * 0.45) / 2 },
        { w: lineWidth * 0.36, x: left + (lineWidth * 0.64) / 2 },
        { w: 0, x: left },
        { w: lineWidth, x: left },
        { w: lineWidth * 0.86, x: left },
        { w: lineWidth * 0.92, x: left },
        { w: lineWidth * 0.7, x: left },
        { w: 0, x: left },
        { w: lineWidth * 0.5, x: right - lineWidth * 0.5 },
    ];

    return (
        <Animated.View style={{ height, width }}>
            <Canvas style={{ height, width }}>
                <Path color={paper} path={paper_} />
                <Path color={withAlpha(ink, 0.22)} path={paper_} style="stroke" strokeWidth={1}>
                    <DashPathEffect intervals={[4, 4]} />
                </Path>
                {lines.map((line, index) =>
                    line.w === 0 ? null : (
                        <RoundedRect
                            color={withAlpha(ink, index === lines.length - 1 ? 0.55 : 0.18)}
                            height={index === lines.length - 1 ? LINE_HEIGHT + 2 : LINE_HEIGHT}
                            key={index}
                            r={LINE_HEIGHT / 2}
                            width={line.w}
                            x={line.x}
                            y={firstLine + index * LINE_GAP}
                        />
                    )
                )}
            </Canvas>
            <Animated.View
                pointerEvents="none"
                style={[{ height, left: 0, position: "absolute", top: 0, width }, bracketStyle]}
            >
                <Canvas style={{ height, width }}>
                    <Path
                        color={tint}
                        path={brackets}
                        strokeCap="round"
                        strokeJoin="round"
                        strokeWidth={BRACKET_STROKE}
                        style="stroke"
                    />
                </Canvas>
            </Animated.View>
        </Animated.View>
    );
}
