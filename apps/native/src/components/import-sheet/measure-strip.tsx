import type { ReactNode } from "react";
import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";

/** `figure` renders as the bold tabular number; `value` renders as given, already coloured and signed. */
export type MeasureStripCell = {
    key: string;
    label: string;
} & ({ figure: string; value?: never } | { figure?: never; value: ReactNode });

export function MeasureStrip({ cells, className }: { cells: readonly MeasureStripCell[]; className?: string }) {
    const stacked = useAccessibilityTextSize();
    return (
        <View className={cn("border-border border-y", className)}>
            <View className={stacked ? undefined : "flex-row"}>
                {cells.map((cell, index) => (
                    <View className={stacked ? undefined : cn("flex-1", index > 0 && "pl-3.5")} key={cell.key}>
                        {index > 0 ? (
                            <View
                                className={
                                    stacked ? "bg-border h-px w-full" : "bg-border absolute inset-y-0 left-0 w-px"
                                }
                            />
                        ) : null}
                        <View className="gap-0.75 py-2.5">
                            <MonoLabel numberOfLines={1}>{cell.label}</MonoLabel>
                            {cell.figure === undefined ? (
                                cell.value
                            ) : (
                                <Text
                                    className="font-sans-semibold text-body text-foreground tabular-nums"
                                    numberOfLines={1}
                                >
                                    {cell.figure}
                                </Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
