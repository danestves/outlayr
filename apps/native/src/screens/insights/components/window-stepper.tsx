import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction } from "@expo/ui/community/menu";
import ArrowLeft01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

interface WindowStepperProps {
    actions: MenuAction[];
    canStepBack: boolean;
    canStepForward: boolean;
    onAction: (id: string) => void;
    onStep: (direction: 1 | -1) => void;
    title: string;
}

export function WindowStepper({ actions, canStepBack, canStepForward, onAction, onStep, title }: WindowStepperProps) {
    const t = useTranslation();
    return (
        <View className="bg-surface-secondary shrink-0 flex-row items-center rounded-full">
            <StepButton
                enabled={canStepBack}
                icon={ArrowLeft01Icon}
                label={t("insights.window.earlier")}
                onPress={() => onStep(-1)}
            />
            <View accessibilityLabel={t("insights.window.shown")}>
                <MenuView
                    actions={actions}
                    onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}
                    shouldOpenOnLongPress={false}
                    title={t("insights.window.title")}
                >
                    <Text className="font-sans-semibold text-foreground text-subtitle py-1.5" numberOfLines={1}>
                        {title}
                    </Text>
                </MenuView>
            </View>
            <StepButton
                enabled={canStepForward}
                icon={ArrowRight01Icon}
                label={t("insights.window.later")}
                onPress={() => onStep(1)}
            />
        </View>
    );
}

function StepButton({
    enabled,
    icon,
    label,
    onPress,
}: {
    enabled: boolean;
    icon: IconSvgElement;
    label: string;
    onPress: () => void;
}) {
    const colors = useColors();
    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled }}
            className={cn("h-8 w-9 items-center justify-center active:opacity-60", !enabled && "opacity-40")}
            disabled={!enabled}
            hitSlop={6}
            onPress={onPress}
        >
            <HugeiconsIcon color={enabled ? colors.foreground : colors.muted} icon={icon} size={15} strokeWidth={2.2} />
        </Pressable>
    );
}
