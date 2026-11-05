import type { ReactNode } from "react";
import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";

export function SavingsSection({ children, label, title }: { children: ReactNode; label: string; title: string }) {
    return (
        <View>
            <View className="flex-row items-baseline justify-between pb-2">
                <Text accessibilityRole="header" className="font-sans-semibold text-subtitle text-foreground">
                    {title}
                </Text>
                <MonoLabel>{label}</MonoLabel>
            </View>
            <View className="border-foreground border-t">{children}</View>
        </View>
    );
}

const FIGURE_TONE = { foreground: "text-foreground", income: "text-income", muted: "text-muted" } as const;

interface SavingsRowProps {
    detail?: string;
    figure?: string;
    label: string;
    tone?: "foreground" | "income" | "muted";
    trailing?: ReactNode;
}

export function SavingsRow({
    children,
    detail,
    figure,
    label,
    tone = "income",
    trailing,
}: SavingsRowProps & { children?: ReactNode }) {
    return (
        <View className="border-border border-b py-2.5">
            <View
                accessibilityLabel={
                    trailing === undefined ? [label, detail, figure].filter(Boolean).join(". ") : undefined
                }
                accessible={trailing === undefined}
                className="flex-row items-center gap-3"
            >
                <View className="flex-1">
                    <Text className="font-sans-medium text-subtitle text-foreground">{label}</Text>
                    {detail === undefined ? null : <Text className="text-footnote text-muted">{detail}</Text>}
                </View>
                {trailing ?? (
                    <Text className={cn("font-sans-medium text-subtitle tabular-nums", FIGURE_TONE[tone])}>
                        {figure}
                    </Text>
                )}
            </View>
            {children}
        </View>
    );
}

const PRICE_SEGMENT_MIN_WIDTH = 6;

export function SavingsBar({ kept, price }: { kept: number; price: number }) {
    return (
        <View className="h-1.5 flex-row gap-0.5">
            <View className="bg-income rounded-full" style={{ flexBasis: 0, flexGrow: kept }} />
            <View
                className="bg-foreground rounded-full"
                style={{ flexBasis: 0, flexGrow: price, minWidth: PRICE_SEGMENT_MIN_WIDTH }}
            />
        </View>
    );
}
