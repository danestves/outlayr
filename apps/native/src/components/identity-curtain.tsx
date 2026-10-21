import { MeshGradientView } from "expo-mesh-gradient";
import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { curtainShade, withAlpha } from "@/theme/shade";
import { useIsDark } from "@/theme/use-is-dark";

const CURTAIN_HEIGHT = 260;

const POINTS: number[][] = [
    [0, 0],
    [0.5, 0],
    [1, 0],
    [0, 0.5],
    [0.5, 0.42],
    [1, 0.5],
    [0, 1],
    [0.5, 1],
    [1, 1],
];

const MID_ALPHA = [0.55, 0.5, 0.55];

function meshHues(shades: string[]): [string, string, string] {
    switch (shades.length) {
        case 0: {
            return ["#000000", "#000000", "#000000"];
        }
        case 1: {
            return [shades[0], shades[0], shades[0]];
        }
        case 2: {
            return [shades[0], shades[0], shades[1]];
        }
        default: {
            return [shades[0], shades[1], shades[2]];
        }
    }
}

// With `backgroundRepeat: "no-repeat"`, `CURTAIN_HEIGHT` is where the mesh stops and the plain grouped grey begins.
export const CURTAIN_LAYER_SIZE = [
    { x: "100%", y: CURTAIN_HEIGHT },
    { x: "100%", y: CURTAIN_HEIGHT },
    { x: "100%", y: CURTAIN_HEIGHT },
] as const;

const bloom = (color: string, left: string) =>
    ({
        colorStops: [
            { color, positions: ["0%"] },
            { color: withAlpha(color, MID_ALPHA[1]), positions: ["45%"] },
            { color: withAlpha(color, 0), positions: ["100%"] },
        ],
        position: { left, top: 0 },
        // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- the key is uniwind's radial-gradient option name
        shape: "ellipse",
        size: { x: "70%", y: CURTAIN_HEIGHT },
        type: "radial-gradient",
    }) as const;

export function curtainGradient(hues: string[] | null, isDark: boolean) {
    if (hues == null || hues.length === 0) {
        return;
    }
    const [c0, c1, c2] = meshHues(hues.map((hue) => curtainShade(hue, isDark)));
    return [bloom(c0, "12%"), bloom(c1, "50%"), bloom(c2, "88%")];
}

interface IdentityCurtainProps {
    hues: string[] | null;
}

export function IdentityCurtain({ hues }: IdentityCurtainProps) {
    const isDark = useIsDark();
    const revealed = hues != null && hues.length > 0 ? 1 : 0;
    const progress = useSharedValue(revealed);

    useEffect(() => {
        progress.set(
            withTiming(revealed, {
                duration: 450,
                easing: Easing.inOut(Easing.ease),
            })
        );
    }, [revealed, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ translateY: -CURTAIN_HEIGHT * (1 - progress.get()) }],
    }));

    // Frozen, never cross-faded: mesh interpolation reads as a horizontal sweep.
    // The black fallback only ever renders under a zero opacity.
    const source = hues && hues.length > 0 ? hues : ["#000000"];
    const [c0, c1, c2] = meshHues(source.map((hue) => curtainShade(hue, isDark)));
    const colors = [
        c0,
        c1,
        c2,
        withAlpha(c0, MID_ALPHA[0]),
        withAlpha(c1, MID_ALPHA[1]),
        withAlpha(c2, MID_ALPHA[2]),
        withAlpha(c0, 0),
        withAlpha(c1, 0),
        withAlpha(c2, 0),
    ];

    return (
        <Animated.View
            pointerEvents="none"
            style={[{ height: CURTAIN_HEIGHT, left: 0, position: "absolute", right: 0, top: 0 }, animatedStyle]}
        >
            <MeshGradientView
                colors={colors}
                columns={3}
                ignoresSafeArea
                points={POINTS}
                rows={3}
                style={{ flex: 1 }}
            />
        </Animated.View>
    );
}
