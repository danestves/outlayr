import FlashIcon from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";
import Animated, { Easing, FadeInUp, ReduceMotion } from "react-native-reanimated";

import { RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);
const STEP_MS = 220;
const DEMO_CURRENCY = "USD";

const arrive = (step: number) =>
    FadeInUp.withInitialValues({ transform: [{ translateY: -12 }] })
        .duration(420)
        .delay(step * STEP_MS)
        .easing(EASE.factory())
        .reduceMotion(ReduceMotion.System);

const LOGGED = [
    { amount: 18, color: "#AB723A", icon: "Coffee02", name: "pro.hero.cafe" },
    { amount: 23.4, color: "#4B9263", icon: "ShoppingBasket01", name: "pro.hero.market" },
    { amount: 2.5, color: "#3F6FA8", icon: "Train01", name: "pro.hero.transit" },
] as const;

export function PaywallHero() {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const bank = t("pro.hero.bank");
    const alert = t("pro.hero.alert", {
        amount: formatAmount(LOGGED[0].amount, DEMO_CURRENCY, true, language),
        merchant: t(LOGGED[0].name),
    });
    const logged = t("pro.hero.logged");

    return (
        <View accessibilityLabel={`${bank}: ${alert}. ${logged}.`} accessible className="gap-2 pt-4">
            <Animated.View
                className="bg-surface border-border flex-row items-center gap-3 rounded-[22px] border px-3.5 py-3.5"
                entering={arrive(0)}
            >
                <CategoryIconTile color={colors.foreground} icon="Bank" size={40} />
                <View className="flex-1">
                    <View className="flex-row items-baseline justify-between gap-2">
                        <Text className="text-foreground text-body font-sans-semibold">{bank}</Text>
                        <Text className="text-muted text-footnote">{t("pro.hero.now")}</Text>
                    </View>
                    <Text className="text-foreground text-body">{alert}</Text>
                </View>
            </Animated.View>
            <View className="bg-surface overflow-hidden rounded-[18px]">
                {LOGGED.map((row, index) => (
                    <Animated.View
                        className={cn("flex-row items-center gap-3 px-3.5 py-3", index > 0 && "border-border border-t")}
                        entering={arrive(index + 1)}
                        key={row.name}
                    >
                        <CategoryIconTile color={row.color} icon={row.icon} size={36} />
                        <View className="flex-1">
                            <Text className="text-foreground text-body" numberOfLines={1}>
                                {t(row.name)}
                            </Text>
                            <View className="flex-row items-center gap-1">
                                <HugeiconsIcon color={colors.income} icon={FlashIcon} size={11} />
                                <Text className="text-income text-footnote">{logged}</Text>
                            </View>
                        </View>
                        <RowAmount amount={row.amount} code={DEMO_CURRENCY} income={false} isFuture={false} />
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}
