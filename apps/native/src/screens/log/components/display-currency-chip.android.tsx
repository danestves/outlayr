import type { MenuAction } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { MaterialMenu } from "@/components/material-menu";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { DisplayCurrencyChip as DisplayCurrencyChipBase } from "./display-currency-chip";

/** Namespaced away from currency codes. */
const MANAGE_CURRENCIES_ACTION = "log.currency.manage";
const PRESSED_ALPHA = 0.1;

/** 32dp; `MaterialMenu` adds the 48dp touch area. */
export const DisplayCurrencyChip: typeof DisplayCurrencyChipBase = ({ code, options, onSelect, onManage }) => {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const actions: MenuAction[] = [
        ...options.map((option) => ({
            id: option,
            // SAFETY: as on iOS, the assertion keeps `state` the union.
            state: (option === code ? "on" : "off") as "on" | "off",
            title: option,
        })),
        { id: MANAGE_CURRENCIES_ACTION, title: t("log.insights.currencyManage") },
    ];

    return (
        <MaterialMenu
            accessibilityLabel={t("log.insights.currencyShown")}
            accessibilityValue={{ text: code }}
            actions={actions}
            onPressAction={(id) => {
                if (id === MANAGE_CURRENCIES_ACTION) {
                    onManage();
                    return;
                }
                onSelect(id);
            }}
            renderTrigger={({ pressed }) => (
                <View className="border-m3-outline h-8 flex-row items-center gap-1 rounded-lg border pr-2 pl-3">
                    {pressed ? (
                        <View
                            className="absolute inset-0 rounded-[7px]"
                            pointerEvents="none"
                            style={{ backgroundColor: withAlpha(m3.onSurfaceVariant, PRESSED_ALPHA) }}
                        />
                    ) : null}
                    <Text className="font-sans-medium text-caption text-m3-on-surface-variant leading-5">{code}</Text>
                    <HugeiconsIcon color={m3.onSurfaceVariant} icon={ArrowDown01Icon} size={18} />
                </View>
            )}
        />
    );
};
