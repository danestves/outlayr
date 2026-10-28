import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useMaterialColors } from "@/theme/use-material-colors";

export interface SwatchOption {
    label: string;
    swatch?: string;
    value: number;
}

function Frame({ children, ringColor, selected }: { children: ReactNode; ringColor: string; selected: boolean }) {
    return (
        <View
            className="size-8 items-center justify-center rounded-full border-2"
            style={{ borderColor: selected ? ringColor : "transparent" }}
        >
            {children}
        </View>
    );
}

function FlatSwatch({ color, selected }: { color: string; selected: boolean }) {
    return (
        <Frame ringColor={color} selected={selected}>
            <View className="size-6 rounded-full" style={{ backgroundColor: color }} />
        </Frame>
    );
}

function DynamicSwatch({ selected }: { selected: boolean }) {
    const m3 = useMaterialColors();
    return (
        <Frame ringColor={m3.primary} selected={selected}>
            <View className="size-6 flex-row flex-wrap overflow-hidden rounded-full">
                {[m3.primary, m3.secondary, m3.tertiary, m3.primaryContainer].map((color) => (
                    <View className="size-3" key={color} style={{ backgroundColor: color }} />
                ))}
            </View>
        </Frame>
    );
}

export function SwatchStrip({
    onChange,
    options,
    value,
}: {
    onChange: (value: number) => void;
    options: readonly SwatchOption[];
    value: number;
}) {
    return (
        <ScrollView
            accessibilityRole="radiogroup"
            className="max-w-[65%] grow-0"
            contentContainerClassName="items-center"
            horizontal
            showsHorizontalScrollIndicator={false}
        >
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        accessibilityLabel={option.label}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        className="size-9 items-center justify-center active:opacity-60"
                        hitSlop={4}
                        key={option.value}
                        onPress={() => onChange(option.value)}
                    >
                        {option.swatch ? (
                            <FlatSwatch color={option.swatch} selected={selected} />
                        ) : (
                            <DynamicSwatch selected={selected} />
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
