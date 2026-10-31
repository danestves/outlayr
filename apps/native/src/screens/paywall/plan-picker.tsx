import type { ComponentType } from "react";
import { Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { Plan } from "@/domain/pro-plans";
import { useLongWait } from "@/hooks/use-long-wait";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import type { PlanListProps } from "./plan-list";

/** The plans once they load; until then the named wait, or a retry when the store gave none. */
export function PlanPicker({
    empty,
    Choices,
    onRetry,
    plans,
    ...listProps
}: Omit<PlanListProps, "plans"> & {
    empty: boolean;
    Choices: ComponentType<PlanListProps>;
    onRetry: () => void;
    plans: readonly Plan[] | null;
}) {
    const t = useTranslation();
    const colors = useColors();
    const slow = useLongWait(plans === null && !empty);

    if (empty) {
        return (
            <View className="items-center gap-3 pt-8">
                <Text className="text-muted text-subtitle text-center">{t("pro.unavailable")}</Text>
                <Pressable accessibilityRole="button" onPress={onRetry} testID="paywall-retry">
                    <MonoLabel className="text-foreground">{t("pro.retry")}</MonoLabel>
                </Pressable>
            </View>
        );
    }
    if (plans === null) {
        return (
            <View className="items-center pt-8">
                {slow ? (
                    <BusyText className="text-subtitle" color={colors.foreground}>
                        {t("pro.plan.loading")}
                    </BusyText>
                ) : null}
            </View>
        );
    }
    return <Choices plans={plans} {...listProps} />;
}
