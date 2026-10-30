import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";

import { MONO_LABEL_CLASS } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useColors } from "@/theme/use-colors";

export type TargetTone = "matched" | "nested" | "quiet";

export interface ImportRowProps {
    detail?: string;
    leading?: ReactNode;
    onPress?: () => void;
    /** Where the row lands in Outlayr; `loud` marks a target that differs from the default. */
    target?: { how?: string; label: string; loud?: boolean; tone?: TargetTone };
    testID?: string;
    title: string;
    toggle?: { onValueChange: (value: boolean) => void; value: boolean };
    value?: string;
}

const HOW_TONE: Record<TargetTone, string> = {
    matched: "text-income",
    nested: "text-tint",
    quiet: "text-muted",
};

export function ImportRow({ detail, leading, onPress, target, testID, title, toggle, value }: ImportRowProps) {
    const colors = useColors();
    const body = (
        <View className="border-border min-h-15 flex-row items-center gap-3 border-b py-2.5">
            {leading}
            <View className="flex-1 gap-0.5">
                <Text className="text-body font-sans-medium text-foreground" numberOfLines={1}>
                    {title}
                </Text>
                {detail ? (
                    <Text className="text-subtitle text-muted" numberOfLines={target ? 1 : 3}>
                        {detail}
                    </Text>
                ) : null}
            </View>
            {value ? <Text className="text-body text-foreground tabular-nums">{value}</Text> : null}
            {target ? (
                <View className="max-w-[45%] items-end gap-0.5">
                    <Text
                        className={cn(
                            "text-subtitle",
                            target.loud ? "font-sans-semibold text-foreground" : "text-muted"
                        )}
                        numberOfLines={1}
                    >
                        {target.label}
                    </Text>
                    {target.how ? (
                        <Text className={cn(MONO_LABEL_CLASS, HOW_TONE[target.tone ?? "quiet"])} numberOfLines={1}>
                            {target.how}
                        </Text>
                    ) : null}
                </View>
            ) : null}
            {toggle ? (
                <Switch
                    accessibilityLabel={title}
                    onValueChange={toggle.onValueChange}
                    trackColor={{ false: colors.subtle, true: colors.tint }}
                    value={toggle.value}
                />
            ) : null}
            {onPress && !toggle ? (
                <HugeiconsIcon color={colors.subtle} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
            ) : null}
        </View>
    );

    if (!onPress) {
        return <View testID={testID}>{body}</View>;
    }
    return (
        <Pressable accessibilityRole="button" className="active:opacity-60" onPress={onPress} testID={testID}>
            {body}
        </Pressable>
    );
}
