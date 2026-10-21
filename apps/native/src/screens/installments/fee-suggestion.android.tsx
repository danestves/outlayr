import { Pressable } from "react-native";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { FeeSuggestionProps } from "./fee-suggestion";
import { useFeeEditor } from "./use-fee-editor";

const PRESSED_ALPHA = 0.12;

export function FeeSuggestion({ accountId, currency, row, visible }: FeeSuggestionProps) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const { commit, minorUnits, open, padRef, padText, setPadText } = useFeeEditor({ accountId, currency, row });
    return (
        <>
            {visible ? (
                <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: withAlpha(m3.primary, PRESSED_ALPHA) }}
                    className="mt-2 h-10 justify-center overflow-hidden rounded-full px-3"
                    onPress={open}
                >
                    <Text className="font-sans-medium text-body text-m3-primary">{t("installments.fee.suggest")}</Text>
                </Pressable>
            ) : null}
            <AmountEntrySheet
                code={currency}
                minorUnits={minorUnits}
                onChange={setPadText}
                onDone={commit}
                ref={padRef}
                value={padText}
            />
        </>
    );
}
