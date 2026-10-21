import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { AccessibilityValue } from "react-native";

import { cn } from "./tw";

const GLASS = isLiquidGlassAvailable();

export function GlassButton({
    onPress,
    accessibilityLabel,
    accessibilityValue,
    className,
    children,
}: {
    accessibilityValue?: AccessibilityValue;
    onPress: () => void;
    accessibilityLabel: string;
    className: string;
    children: ReactNode;
}) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityValue={accessibilityValue}
            className="active:opacity-70"
            onPress={onPress}
        >
            <GlassSurface className={className}>{children}</GlassSurface>
        </Pressable>
    );
}

export function GlassSurface({ className, children }: { className: string; children: ReactNode }) {
    return (
        <View className={cn("flex-row items-center justify-center gap-1.5 overflow-hidden", className)}>
            {GLASS ? (
                <GlassView glassEffectStyle="regular" isInteractive style={StyleSheet.absoluteFill} />
            ) : (
                <View className="bg-surface absolute inset-0" />
            )}
            {children}
        </View>
    );
}
