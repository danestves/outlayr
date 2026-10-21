import { Host } from "@expo/ui";
import { Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { frame, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { useTranslation } from "@/i18n/context";

export interface CategoryKindToggleProps {
    income: boolean;
    onChange: (income: boolean) => void;
}

export function CategoryKindToggle({ income, onChange }: CategoryKindToggleProps) {
    const t = useTranslation();
    return (
        <Host matchContents>
            <Picker
                label=""
                modifiers={[pickerStyle("segmented"), frame({ width: 190 })]}
                onSelectionChange={(value) => onChange(value === "income")}
                selection={income ? "income" : "expense"}
            >
                <SwiftText modifiers={[tag("expense")]}>{t("common.expense")}</SwiftText>
                <SwiftText modifiers={[tag("income")]}>{t("common.income")}</SwiftText>
            </Picker>
        </Host>
    );
}
