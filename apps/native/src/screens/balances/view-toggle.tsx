import { Host } from "@expo/ui";
import { Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import type { BalancesView } from "@/domain/balances";
import { useTranslation } from "@/i18n/context";

export interface BalancesViewToggleProps {
    onChange: (view: BalancesView) => void;
    view: BalancesView;
}

/** The bare picker, for a SwiftUI `List` that already hosts it. */
export function BalancesViewPicker({ onChange, view }: BalancesViewToggleProps) {
    const t = useTranslation();
    return (
        <Picker
            label=""
            modifiers={[pickerStyle("segmented")]}
            onSelectionChange={(next) => onChange(next === "categories" ? "categories" : "accounts")}
            selection={view}
        >
            <SwiftText modifiers={[tag("accounts")]}>{t("balances.view.accounts")}</SwiftText>
            <SwiftText modifiers={[tag("categories")]}>{t("balances.view.categories")}</SwiftText>
        </Picker>
    );
}

export function BalancesViewToggle(props: BalancesViewToggleProps) {
    return (
        // SwiftUI's segmented control stretches to whatever width it is offered.
        <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
            <BalancesViewPicker {...props} />
        </Host>
    );
}
