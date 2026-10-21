import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import type { SettingsIconName } from "@/components/settings/settings-icons";
import { settingsIcon } from "@/components/settings/settings-icons";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

const GLYPH = 20;

const TITLE_INSET = "pl-8";

export interface RowShellProps {
    below?: ReactNode;
    children?: ReactNode;
    destructive?: boolean;
    detail?: string;
    icon?: SettingsIconName;
    title: string;
}

export function RowShell({ icon, title, destructive, detail, children, below }: RowShellProps) {
    const colors = useColors();
    const largeText = useAccessibilityTextSize();
    return (
        <View className="border-border border-b py-3.5">
            <View className="flex-row items-center gap-3">
                {icon ? (
                    <HugeiconsIcon
                        color={destructive ? colors.danger : colors.foreground}
                        icon={settingsIcon(icon)}
                        size={GLYPH}
                        strokeWidth={1.9}
                    />
                ) : null}
                <Text
                    className={cn("text-body flex-1", destructive ? "text-danger" : "text-foreground")}
                    numberOfLines={largeText ? 2 : 1}
                >
                    {title}
                </Text>
                {children}
            </View>
            {below ? <View className={cn(icon && TITLE_INSET, "items-start")}>{below}</View> : null}
            {detail ? (
                <Text className={cn(icon && TITLE_INSET, "text-muted text-subtitle leading-snug")}>{detail}</Text>
            ) : null}
        </View>
    );
}
