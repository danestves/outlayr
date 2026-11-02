import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text as ComposeText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";

import { MaterialHost } from "@/components/material-host";
import { BalancesView } from "@/domain/balances";
import { useTranslation } from "@/i18n/context";

import type { BalancesViewToggleProps } from "./view-toggle";

const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;
const LABELS = { accounts: "balances.view.accounts", categories: "balances.view.categories" } as const;

export function BalancesViewToggle({ onChange, view }: BalancesViewToggleProps) {
    const t = useTranslation();
    return (
        <MaterialHost matchContents={{ vertical: true }}>
            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                {BalancesView.literals.map((option) => (
                    <SegmentedButton key={option} onClick={() => onChange(option)} selected={view === option}>
                        <SegmentedButton.Label>
                            <ComposeText style={LABEL_FONT}>{t(LABELS[option])}</ComposeText>
                        </SegmentedButton.Label>
                    </SegmentedButton>
                ))}
            </SingleChoiceSegmentedButtonRow>
        </MaterialHost>
    );
}
