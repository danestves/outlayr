import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";

const WIDGET_SHADOW = { boxShadow: "0 1px 4px rgba(23, 21, 15, 0.08)" } as const;

export const WIDGET_SIZE = 160;

export function WidgetCard({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <View className={cn("bg-card rounded-[22px] p-3.5", className)} style={WIDGET_SHADOW}>
            {children}
        </View>
    );
}

interface WidgetProps {
    accessibilityHint?: string;
    accessibilityLabel: string;
    children?: ReactNode;
    className?: string;
    figure: string;
    figureClass?: string;
    onPress: () => void;
    title: string;
    unit: string;
    unitClass?: string;
    width?: number | "100%";
}

export function Widget({
    accessibilityHint,
    accessibilityLabel,
    children,
    className,
    figure,
    figureClass = "text-foreground",
    onPress,
    title,
    unit,
    unitClass = "text-subtle",
    width,
}: WidgetProps) {
    return (
        <Pressable
            accessibilityHint={accessibilityHint}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            className={cn("bg-card justify-between gap-3 rounded-[22px] p-3.5 active:opacity-70", className)}
            onPress={onPress}
            style={[WIDGET_SHADOW, { minHeight: WIDGET_SIZE, width }]}
        >
            <View className="gap-1.75">
                <MonoLabel numberOfLines={1}>{`${title}  ›`}</MonoLabel>
                <View>
                    {figure ? (
                        <Text
                            adjustsFontSizeToFit
                            className={cn("font-sans-semibold text-title tabular-nums", figureClass)}
                            minimumFontScale={0.6}
                            numberOfLines={1}
                        >
                            {figure}
                        </Text>
                    ) : null}
                    {unit ? (
                        <Text className={cn("font-sans-medium text-footnote", unitClass)} numberOfLines={2}>
                            {unit}
                        </Text>
                    ) : null}
                </View>
            </View>
            {children}
        </Pressable>
    );
}
