import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { DebtsScreenOverview } from "@/data/debts";
import { useNow } from "@/data/use-now";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { installmentRow, installmentRows } from "./installment-rows";

const PRESSED_ALPHA = 0.1;
const TILE_RADIUS = 10;
const ADD_GLYPH = 18;

export function InstallmentSection({ debts }: { debts: DebtsScreenOverview }) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const m3 = useMaterialColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const entries = installmentRows(debts);
    if (entries.length === 0) {
        return null;
    }

    return (
        <>
            <View className="px-4 pt-4 pb-2">
                <Eyebrow colors={colors}>{t("accounts.installments.title")}</Eyebrow>
            </View>
            {entries.map((entry) => {
                const line = installmentRow(entry, { language, nowMs, showCents, t });
                return (
                    <Pressable
                        accessibilityLabel={`${line.title}, ${line.progress}, ${line.when}`}
                        accessibilityRole="button"
                        accessibilityValue={{ text: line.amount }}
                        android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                        className="border-m3-outline-variant bg-m3-surface min-h-18 flex-row items-center gap-4 border-b px-4 py-2"
                        key={entry.id}
                        onPress={() =>
                            router.push({
                                params: { planId: entry.id },
                                pathname: "/installments/[planId]",
                            })
                        }
                    >
                        <AccountTile account={entry.account} size={PARENT_TILE} />
                        <View className="flex-1">
                            <Text className="text-body text-m3-on-surface" numberOfLines={1}>
                                {line.title}
                            </Text>
                            <Text className="text-caption text-m3-on-surface-variant" numberOfLines={1}>
                                {line.progress}
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text
                                className="font-sans-medium text-body text-m3-on-surface tabular-nums"
                                numberOfLines={1}
                            >
                                {line.amount}
                            </Text>
                            <Text
                                className={
                                    line.overdue
                                        ? "text-caption text-m3-error"
                                        : "text-caption text-m3-on-surface-variant"
                                }
                                numberOfLines={1}
                            >
                                {line.when}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
            <AddInstallmentRow />
        </>
    );
}

function AddInstallmentRow() {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const item = useNewDebtItems().find((candidate) => candidate.id === "installments");
    if (item === undefined) {
        return null;
    }

    return (
        <Pressable
            accessibilityLabel={t("accounts.add.installments")}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="border-m3-outline-variant bg-m3-surface min-h-18 flex-row items-center gap-4 border-b px-4 py-2"
            onPress={item.onPress}
        >
            <View
                className="items-center justify-center"
                style={{
                    backgroundColor: withAlpha(m3.primary, TILE_WASH_OPACITY),
                    borderRadius: TILE_RADIUS,
                    height: PARENT_TILE,
                    width: PARENT_TILE,
                }}
            >
                <HugeiconsIcon color={m3.primary} icon={item.glyph} size={ADD_GLYPH} />
            </View>
            <Text className="text-body text-m3-primary" numberOfLines={1}>
                {t("accounts.add.installments")}
            </Text>
        </Pressable>
    );
}
