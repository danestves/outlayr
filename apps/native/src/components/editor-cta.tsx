import { Button } from "panelui-native/components/button";
import { Text, View } from "react-native";

import { CTA_HEIGHT } from "@/components/editor-style";

// panelui's disabled dim never lands: its `AnimatedPressable` writes `opacity` every frame, beating any static class.
// So the dim goes on this wrapper, which nothing animates.
const DISABLED_OPACITY = 0.4;

interface EditorCtaProps {
    busy?: boolean;
    canSave: boolean;
    label: string;
    maxFontSizeMultiplier?: number;
    onPress: () => void;
}

export function EditorCta({ label, canSave, busy = false, maxFontSizeMultiplier, onPress }: EditorCtaProps) {
    return (
        <View style={{ minHeight: CTA_HEIGHT, opacity: canSave || busy ? 1 : DISABLED_OPACITY }} testID="editor-cta">
            <Button
                className="rounded-full"
                disabled={!canSave || busy}
                fullWidth
                onPress={onPress}
                size="md"
                variant="primary"
            >
                {maxFontSizeMultiplier === undefined ? (
                    label
                ) : (
                    <Text
                        className="text-primary-foreground min-w-0 shrink text-center text-[16px] font-medium"
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                    >
                        {label}
                    </Text>
                )}
            </Button>
        </View>
    );
}
