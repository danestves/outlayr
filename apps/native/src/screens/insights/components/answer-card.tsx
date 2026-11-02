import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { WidgetCard } from "@/components/widget-card";
import { useColors } from "@/theme/use-colors";

interface AnswerCardProps {
    children?: ReactNode;
    evidence?: string;
    kicker: string;
    kickerClass?: string;
    onSee?: () => void;
    seeLabel?: string;
    title: string;
}

export function AnswerCard({ children, evidence, kicker, kickerClass, onSee, seeLabel, title }: AnswerCardProps) {
    const colors = useColors();
    return (
        <WidgetCard className="p-4">
            <MonoLabel className={kickerClass} numberOfLines={1}>
                {kicker}
            </MonoLabel>
            <Text accessibilityRole="header" className="font-sans-bold text-headline text-foreground pt-2">
                {title}
            </Text>
            {evidence ? <Text className="text-caption text-muted pt-1">{evidence}</Text> : null}
            {children ? <View className="pt-3">{children}</View> : null}
            {onSee && seeLabel ? (
                <Pressable
                    accessibilityRole="button"
                    className="border-border mt-3 flex-row items-center justify-between border-t pt-3 active:opacity-60"
                    onPress={onSee}
                >
                    <Text className="font-sans-medium text-subtitle text-foreground flex-1" numberOfLines={1}>
                        {seeLabel}
                    </Text>
                    <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
                </Pressable>
            ) : null}
        </WidgetCard>
    );
}
