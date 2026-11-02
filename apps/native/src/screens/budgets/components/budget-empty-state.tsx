import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EmptyState, useMark } from "@/components/empty-state";
import { Arrive } from "@/components/mark-motion";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

/** Shown while there is no expense to set a limit against. */
export function BudgetEmptyState({ onAddTransaction }: { onAddTransaction: () => void }) {
    const t = useTranslation();
    return (
        <EmptyState
            action={
                <Pressable
                    accessibilityRole="button"
                    className="bg-accent rounded-full px-7 py-3.5 active:opacity-80"
                    onPress={onAddTransaction}
                >
                    <Text className="font-sans-semibold text-accent-foreground text-body">
                        {t("budgets.empty.action")}
                    </Text>
                </Pressable>
            }
            body={t("budgets.empty.body")}
            mark={<PlotUnset />}
            tier="takeover"
            title={t("budgets.empty.title")}
        />
    );
}

const PLOT_W = MARK_CEILING.takeover;
const PLOT_H = 128;

const LIMIT_DROP = -24;
const OVERLAY: ViewStyle = {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
};

function PlotUnset() {
    const ink = useMark();
    const colors = useColors();
    return (
        <View style={{ height: PLOT_H, width: PLOT_W }}>
            <Svg height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width={PLOT_W}>
                <Path d={`M14 6 V${PLOT_H - 16} H${PLOT_W - 4}`} fill="none" stroke={ink.rule} strokeWidth={1.5} />
                <Path
                    d={`M14 ${(PLOT_H - 16 + 30) / 2} H${PLOT_W - 4}`}
                    fill="none"
                    stroke={ink.rule}
                    strokeDasharray="2 7"
                    strokeWidth={1}
                />
                <Path
                    d={`M14 ${PLOT_H - 16} H${PLOT_W - 4}`}
                    stroke={colors.foreground}
                    strokeLinecap="round"
                    strokeWidth={3}
                />
            </Svg>
            <Arrive distance={LIMIT_DROP} style={OVERLAY}>
                <Svg height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width={PLOT_W}>
                    <Path
                        d={`M14 30 H${PLOT_W - 4}`}
                        fill="none"
                        stroke={ink.edge}
                        strokeDasharray="6 6"
                        strokeWidth={2}
                    />
                </Svg>
            </Arrive>
        </View>
    );
}
