import { Image } from "expo-image";
import { View } from "react-native";
import Animated, {
    FadeIn,
    useAnimatedReaction,
    useAnimatedStyle,
    useDerivedValue,
    useReducedMotion,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { ScanSweep } from "@/components/receipt/scan-sweep";

const STAGE_SPRING = { damping: 20, mass: 0.9, stiffness: 180 };
const STAGE_RADIUS = 20;
const THUMB_RADIUS = 12;
const DIMMED_OPACITY = 0.55;

export interface StageBox {
    height: number;
    width: number;
}

interface PhotoStageProps {
    /** Letterboxed to the photo's own aspect by the caller. */
    box: StageBox;
    dimmed?: boolean;
    scanning: boolean;
    tint: string;
    uri: string;
}

export function PhotoStage({ box, dimmed = false, scanning, tint, uri }: PhotoStageProps) {
    const reducedMotion = useReducedMotion();
    const compact = !scanning && box.height < 160;
    const { height: boxHeight, width: boxWidth } = box;
    const radiusTarget = compact ? THUMB_RADIUS : STAGE_RADIUS;
    const width = useDerivedValue(() =>
        reducedMotion ? withTiming(boxWidth, { duration: 180 }) : withSpring(boxWidth, STAGE_SPRING)
    );
    const height = useDerivedValue(() =>
        reducedMotion ? withTiming(boxHeight, { duration: 180 }) : withSpring(boxHeight, STAGE_SPRING)
    );
    const radius = useDerivedValue(() =>
        reducedMotion ? withTiming(radiusTarget, { duration: 180 }) : withSpring(radiusTarget, STAGE_SPRING)
    );
    const opacity = useSharedValue(1);

    useAnimatedReaction(
        () => dimmed,
        (isDimmed) => {
            opacity.set(withTiming(isDimmed ? DIMMED_OPACITY : 1, { duration: 220 }));
        }
    );

    const frame = useAnimatedStyle(() => ({
        borderRadius: radius.get(),
        height: height.get(),
        opacity: opacity.get(),
        width: width.get(),
    }));

    return (
        <Animated.View
            className="bg-surface overflow-hidden"
            entering={FadeIn.duration(260)}
            style={[frame, { borderCurve: "continuous" }]}
        >
            <Image
                contentFit="cover"
                source={{ uri }}
                style={{ height: "100%", width: "100%" }}
                transition={reducedMotion ? 0 : 200}
            />
            {scanning ? (
                <View pointerEvents="none" style={{ height: box.height, position: "absolute", width: box.width }}>
                    <ScanSweep color={tint} height={box.height} width={box.width} />
                </View>
            ) : null}
        </Animated.View>
    );
}
