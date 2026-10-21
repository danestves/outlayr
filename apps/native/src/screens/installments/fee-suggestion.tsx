import { Pressable } from "react-native";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { Text } from "@/components/text";
import type { InstallmentRow } from "@/data/installments-core";
import { useTranslation } from "@/i18n/context";

import { useFeeEditor } from "./use-fee-editor";

export interface FeeSuggestionProps {
    accountId: string;
    currency: string;
    row: InstallmentRow;
    visible: boolean;
}

export function FeeSuggestion({ accountId, currency, row, visible }: FeeSuggestionProps) {
    const t = useTranslation();
    const { commit, minorUnits, open, padRef, padText, setPadText } = useFeeEditor({ accountId, currency, row });
    return (
        <>
            {visible ? (
                <Pressable accessibilityRole="button" className="self-start pt-4 active:opacity-60" onPress={open}>
                    <Text className="text-tint text-subtitle">{t("installments.fee.suggest")}</Text>
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
