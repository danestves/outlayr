import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { MarkInk } from "@/components/empty-state";
import { Slot, Tile } from "@/components/empty-state-parts";
import { Fade, Settle } from "@/components/mark-motion";
import { staggerDelay } from "@/theme/mark-motion";
import type { ThemeColors } from "@/theme/use-colors";

export const EMPTY_MARK_TILE = 34;
const EMPTY_MARK_GAP = 11;
export const EMPTY_MARK_WIDTH = EMPTY_MARK_TILE * 4 + EMPTY_MARK_GAP * 3;

export function CategoryGridOpen({ colors }: { colors: ThemeColors }) {
    return (
        <MarkInk tier="inFlow">
            <View className="flex-row items-center" style={{ gap: EMPTY_MARK_GAP, width: EMPTY_MARK_WIDTH }}>
                <Fade delay={staggerDelay(0)} from={0} to={1}>
                    <Tile opacity={1} size={EMPTY_MARK_TILE} />
                </Fade>
                <Fade delay={staggerDelay(1)} from={0} to={1}>
                    <Tile opacity={0.6} size={EMPTY_MARK_TILE} />
                </Fade>
                <Slot
                    height={EMPTY_MARK_TILE}
                    radius={EMPTY_MARK_TILE * 0.24}
                    style={{ alignItems: "center", justifyContent: "center" }}
                    width={EMPTY_MARK_TILE}
                >
                    <Settle delay={staggerDelay(3)}>
                        <HugeiconsIcon color={colors.foreground} icon={PlusSignIcon} size={15} strokeWidth={2.4} />
                    </Settle>
                </Slot>
                <Fade delay={staggerDelay(2)} from={0} to={1}>
                    <Tile opacity={0.28} size={EMPTY_MARK_TILE} />
                </Fade>
            </View>
        </MarkInk>
    );
}
