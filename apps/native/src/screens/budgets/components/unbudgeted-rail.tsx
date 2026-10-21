import { Pressable, View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { UnbudgetedScope } from "@/data/budgets";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

const RAIL_LIMIT = 2;

interface UnbudgetedRailProps {
    currency: string;
    everythingTypical: number | null;
    offerEverything: boolean;
    onPress: (scope: UnbudgetedScope | null) => void;
    /** The cadence the typical figure is stated in, e.g. "a month". */
    periodPhrase: string;
    scopes: readonly UnbudgetedScope[];
}

export function UnbudgetedRail({
    scopes,
    currency,
    everythingTypical,
    offerEverything,
    periodPhrase,
    onPress,
}: UnbudgetedRailProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const shown = scopes.slice(0, RAIL_LIMIT);

    if (shown.length === 0 && !offerEverything) {
        return null;
    }

    const typicalLine = (amount: number) =>
        t("budgets.rail.typical", {
            amount: formatAmount(amount, currency, false, language),
            period: periodPhrase,
        });

    return (
        <View className="pt-7">
            <MonoLabel>{t("budgets.rail.title")}</MonoLabel>
            <View className="border-border mt-2 border-t">
                {offerEverything ? (
                    <Pressable
                        accessibilityRole="button"
                        className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-60"
                        onPress={() => onPress(null)}
                    >
                        {/* The ledger itself has no category to draw. */}
                        <CategoryIconTile color="#767676" emoji={null} icon={null} size={30} />
                        <View className="flex-1 gap-0.5">
                            <Text className="text-body text-foreground">{t("budgets.scope.everything")}</Text>
                            {everythingTypical === null ? null : (
                                <Text className="text-muted text-subtitle tabular-nums">
                                    {typicalLine(everythingTypical)}
                                </Text>
                            )}
                        </View>
                        <Text className="text-tint text-subtitle">{t("budgets.rail.set")}</Text>
                    </Pressable>
                ) : null}
                {shown.map((scope) => (
                    <Pressable
                        accessibilityRole="button"
                        className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-60"
                        key={scope.categoryId}
                        onPress={() => onPress(scope)}
                    >
                        <CategoryIconTile color={scope.color} emoji={scope.emoji} icon={scope.icon} size={30} />
                        <View className="flex-1 gap-0.5">
                            <Text className="text-body text-foreground">{scope.name}</Text>
                            <Text className="text-muted text-subtitle tabular-nums">{typicalLine(scope.typical)}</Text>
                        </View>
                        <Text className="text-tint text-subtitle">{t("budgets.rail.set")}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}
