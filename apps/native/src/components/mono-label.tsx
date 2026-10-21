import { Text } from "react-native";

import { cn } from "./tw";

export const MONO_LABEL_CLASS = "text-eyebrow tracking-eyebrow font-mono uppercase";

interface MonoLabelProps {
    accessibilityRole?: "header";
    children: string;
    className?: string;
    maxFontSizeMultiplier?: number;
    numberOfLines?: number;
}

/** Callers pass already-composed copy, e.g. "SPENT · THIS MONTH". */
export function MonoLabel({
    accessibilityRole,
    children,
    className,
    maxFontSizeMultiplier,
    numberOfLines,
}: MonoLabelProps) {
    return (
        <Text
            accessibilityRole={accessibilityRole}
            className={cn(MONO_LABEL_CLASS, "text-muted", className)}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            numberOfLines={numberOfLines}
        >
            {children}
        </Text>
    );
}
