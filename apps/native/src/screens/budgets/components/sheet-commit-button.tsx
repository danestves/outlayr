import { Pressable } from "react-native";

import { Text } from "@/components/text";

export interface SheetCommitButtonProps {
    busy?: boolean;
    disabled?: boolean;
    label: string;
    onPress: () => void;
}

const DISABLED_OPACITY = 0.4;

export function SheetCommitButton({ busy = false, disabled = false, label, onPress }: SheetCommitButtonProps) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled }}
            className="bg-tint h-12 items-center justify-center rounded-[14px] active:opacity-80"
            disabled={disabled || busy}
            onPress={onPress}
            style={disabled && !busy ? { opacity: DISABLED_OPACITY } : undefined}
        >
            <Text className="font-sans-semibold text-accent-foreground text-body">{label}</Text>
        </Pressable>
    );
}
