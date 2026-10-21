import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

import { confettiBurst } from "@/domain/confetti";
import type { ConfettiPiece } from "@/domain/confetti";
import { celebration } from "@/lib/celebration";
import { useColors } from "@/theme/use-colors";

const PIECE_COUNT = 36;

interface ConfettiProps {
    height: number;
    /** Changing this re-seeds the burst; the same value never re-fires. */
    seed: number;
    /** In points; pieces launch across it and fall out the bottom. */
    width: number;
}

export function CelebrationConfetti() {
    const { height, width } = useWindowDimensions();
    const reduced = useReducedMotion();
    const bursts = useSyncExternalStore(celebration.subscribe, celebration.bursts);
    const [seen] = useState(bursts);

    if (reduced || bursts === seen) {
        return null;
    }
    return <Confetti height={height} key={bursts} seed={bursts} width={width} />;
}

export function Confetti({ width, height, seed }: ConfettiProps) {
    const colors = useColors();
    const palette = useMemo(() => [colors.income, colors.tint, colors.warning, colors.foreground], [colors]);
    const pieces = useMemo(() => confettiBurst(PIECE_COUNT, palette.length, seed), [palette.length, seed]);

    return (
        <View
            pointerEvents="none"
            style={{
                height,
                left: 0,
                overflow: "hidden",
                position: "absolute",
                top: 0,
                width,
            }}
            testID="confetti"
        >
            {pieces.map((piece) => (
                <Piece
                    color={palette[piece.colorIndex] ?? palette[0]}
                    height={height}
                    key={piece.id}
                    piece={piece}
                    width={width}
                />
            ))}
        </View>
    );
}

function Piece({
    piece,
    color,
    width,
    height,
}: {
    piece: ConfettiPiece;
    color: string;
    width: number;
    height: number;
}) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(
            withDelay(
                piece.delayMs,
                withTiming(1, {
                    duration: piece.durationMs,
                    easing: Easing.out(Easing.quad),
                })
            )
        );
    }, [progress, piece.delayMs, piece.durationMs]);

    const style = useAnimatedStyle(() => {
        const p = progress.get();
        return {
            opacity: interpolate(p, [0, 0.06, 0.75, 1], [0, 1, 1, 0]),
            transform: [
                { translateX: p * piece.drift * width },
                {
                    translateY: interpolate(p, [0, 0.32, 1], [0, -piece.rise * height, piece.fall * height]),
                },
                { rotate: `${p * piece.spin}deg` },
            ],
        };
    });

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: color,
                    borderRadius: 1,
                    height: piece.size * 0.6,
                    left: piece.x * width,
                    position: "absolute",
                    top: height,
                    width: piece.size,
                },
                style,
            ]}
        />
    );
}
