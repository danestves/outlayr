import { View } from "react-native";
import {
    createAnimatedComponent,
    Easing,
    useAnimatedProps,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

import { BusyText } from "@/components/busy-text";
import { OutlayrMark } from "@/components/outlayr-mark";
import { useLongWait } from "@/hooks/use-long-wait";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { ICON_CORNER, SourceLogo } from "./components/parts";

const BODY_HEIGHT = 184;
const MARK = 48;
const WIRE = 44;
const DASH = 4;
const MARCH_MS = 600;

const AnimatedLine = createAnimatedComponent(Line);

function MarchingWire() {
    const colors = useColors();
    const reduced = useReducedMotion();
    const offset = useSharedValue(0);

    const props = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

    return (
        <Svg
            height={2}
            onLayout={() => {
                if (!reduced) {
                    offset.set(withRepeat(withTiming(-DASH * 2, { duration: MARCH_MS, easing: Easing.linear }), -1));
                }
            }}
            style={{ marginHorizontal: 10 }}
            width={WIRE}
        >
            <AnimatedLine
                animatedProps={props}
                stroke={colors.subtle}
                strokeDasharray={`${DASH} ${DASH}`}
                strokeWidth={1.5}
                x1={0}
                x2={WIRE}
                y1={1}
                y2={1}
            />
        </Svg>
    );
}

export function NotionWait() {
    const t = useTranslation();
    const colors = useColors();
    const long = useLongWait(true);

    return (
        <View className="items-center justify-center" style={{ height: BODY_HEIGHT }}>
            {long ? (
                <>
                    <View accessible={false} className="flex-row items-center">
                        <SourceLogo size={MARK} source="notion" />
                        <MarchingWire />
                        <View
                            className="bg-card items-center justify-center"
                            style={{
                                borderColor: colors.border,
                                borderCurve: "continuous",
                                borderRadius: MARK * ICON_CORNER,
                                borderWidth: 0.5,
                                height: MARK,
                                width: MARK,
                            }}
                        >
                            <OutlayrMark size={26} />
                        </View>
                    </View>
                    <BusyText className="text-subtitle font-sans-medium mt-4" color={colors.muted}>
                        {t("mmImport.notion.checking")}
                    </BusyText>
                </>
            ) : null}
        </View>
    );
}
