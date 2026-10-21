import { MenuView } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { GlassSurface } from "@/components/glass-button";
import { MonoLabel } from "@/components/mono-label";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { LOG_CONTROL_SHADOW, LOG_CONTROL_SIZE } from "./amounts-eye-button";

/** Namespaced away from the currency codes that identify every other action. */
const MANAGE_CURRENCIES_ACTION = "log.currency.manage";

export function DisplayCurrencyChip({
    code,
    options,
    onSelect,
    onManage,
}: {
    code: string;
    options: readonly string[];
    onSelect: (code: string) => void;
    onManage: () => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <MenuView
            actions={[
                ...options.map((option) => ({
                    id: option,
                    // SAFETY: keeps the menu item's `state` the union rather than one literal.
                    state: (option === code ? "on" : "off") as "on" | "off",
                    title: option,
                })),
                {
                    id: MANAGE_CURRENCIES_ACTION,
                    title: t("log.insights.currencyManage"),
                },
            ]}
            onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === MANAGE_CURRENCIES_ACTION) {
                    onManage();
                    return;
                }
                onSelect(nativeEvent.event);
            }}
            shouldOpenOnLongPress={false}
            title={t("log.insights.currency")}
        >
            <View
                accessibilityLabel={t("log.insights.currencyShown")}
                accessibilityRole="button"
                accessibilityValue={{ text: code }}
                style={LOG_CONTROL_SHADOW}
            >
                <GlassSurface className={`${LOG_CONTROL_SIZE} pr-3.25 pl-3.75`}>
                    <MonoLabel className="text-foreground text-footnote">{code}</MonoLabel>
                    <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={12} />
                </GlassSurface>
            </View>
        </MenuView>
    );
}
