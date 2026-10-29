import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { FREE_AUTOLOG_PER_MONTH, FREE_CURRENCIES, FREE_INSTALLMENT_APPS } from "@/domain/pro-limits";
import { useTranslation } from "@/i18n/context";

import type { AlsoRow } from "./top-block";

const FREE_COUNT = {
    autolog: FREE_AUTOLOG_PER_MONTH,
    currencies: FREE_CURRENCIES,
    installments: FREE_INSTALLMENT_APPS,
    sync: 0,
} as const satisfies Record<AlsoRow, number>;

const PRO_VALUE = { autolog: "∞", currencies: "∞", installments: "∞", sync: null } as const;

export function AlsoRows({ rows }: { rows: readonly AlsoRow[] }) {
    const t = useTranslation();
    return (
        <View className="pt-5">
            <MonoLabel>{t("pro.also")}</MonoLabel>
            <View className="border-foreground mt-2 border-t">
                {rows.map((row) => {
                    const title = t(`pro.also.${row}`);
                    const detail = t(`pro.also.${row}.detail`, { count: FREE_COUNT[row] });
                    return (
                        <View
                            accessibilityLabel={`${title}. ${detail}`}
                            accessible
                            className="border-border flex-row items-center gap-3 border-b py-2.5"
                            key={row}
                        >
                            <View className="flex-1">
                                <Text className="text-foreground text-subtitle">{title}</Text>
                                <Text className="text-muted text-footnote">{detail}</Text>
                            </View>
                            <Text className="text-income text-footnote font-mono">
                                {PRO_VALUE[row] ?? t("pro.value.on")}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
