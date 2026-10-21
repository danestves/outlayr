import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text as ComposeText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";

import { MaterialHost } from "@/components/material-host";
import { useTranslation } from "@/i18n/context";

import type { CategoryKindToggleProps } from "./category-kind-toggle";

const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;

export function CategoryKindToggle({ income, onChange }: CategoryKindToggleProps) {
    const t = useTranslation();
    return (
        <MaterialHost matchContents={{ vertical: true }}>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                <SegmentedButton onClick={() => onChange(false)} selected={!income}>
                    <SegmentedButton.Label>
                        <ComposeText style={LABEL_FONT}>{t("common.expense")}</ComposeText>
                    </SegmentedButton.Label>
                </SegmentedButton>
                <SegmentedButton onClick={() => onChange(true)} selected={income}>
                    <SegmentedButton.Label>
                        <ComposeText style={LABEL_FONT}>{t("common.income")}</ComposeText>
                    </SegmentedButton.Label>
                </SegmentedButton>
            </SingleChoiceSegmentedButtonRow>
        </MaterialHost>
    );
}
