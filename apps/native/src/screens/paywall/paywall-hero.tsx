import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import FlashIcon from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";
import Animated, { Easing, FadeInUp, ReduceMotion } from "react-native-reanimated";

import { RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);
const STEP_MS = 240;
const DEMO_CURRENCY = "USD";

/** Each piece drops in under the last; Reduce Motion lands every piece on its final frame. */
const arrive = (step: number) =>
    FadeInUp.withInitialValues({ transform: [{ translateY: -10 }] })
        .duration(420)
        .delay(step * STEP_MS)
        .easing(EASE.factory())
        .reduceMotion(ReduceMotion.System);

const LOGGED = [
    { amount: 18, color: "#AB723A", icon: "Coffee02", name: "pro.hero.cafe" },
    { amount: 23.4, color: "#4B9263", icon: "ShoppingBasket01", name: "pro.hero.market" },
] as const;

/** A bank alert becoming entries: the auto-log the paywall sells, with no real bank or merchant named. */
export function PaywallHero() {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const bank = t("pro.hero.bank");
    const alert = t("pro.hero.alert", {
        amount: formatAmount(LOGGED[0].amount, DEMO_CURRENCY, true, language),
        merchant: t(LOGGED[0].name),
    });
    const logsIt = t("pro.hero.logsIt");

    return (
        <View accessibilityLabel={`${bank}: ${alert}. ${logsIt}.`} accessible className="pt-2">
            <Animated.View
                className="bg-surface flex-row items-center gap-3 rounded-2xl px-3.5 py-3"
                entering={arrive(0)}
            >
                <CategoryIconTile color={colors.foreground} icon="Bank" size={32} />
                <View className="flex-1">
                    <View className="flex-row items-baseline justify-between gap-2">
                        <Text className="text-foreground text-subtitle font-sans-semibold">{bank}</Text>
                        <Text className="text-muted text-micro">{t("pro.hero.now")}</Text>
                    </View>
                    <Text className="text-foreground text-footnote">{alert}</Text>
                </View>
            </Animated.View>
            <Animated.View className="flex-row items-center gap-1.5 py-2 pl-5" entering={arrive(1)}>
                <HugeiconsIcon color={colors.income} icon={ArrowDown01Icon} size={12} />
                <MonoLabel className="text-income">{logsIt}</MonoLabel>
            </Animated.View>
            <Animated.View className="bg-surface rounded-2xl px-3.5" entering={arrive(2)}>
                {LOGGED.map((row, index) => (
                    <Animated.View
                        className={cn("flex-row items-center gap-3 py-2.5", index > 0 && "border-border border-t")}
                        entering={index > 0 ? arrive(index + 2) : undefined}
                        key={row.name}
                    >
                        <CategoryIconTile color={row.color} icon={row.icon} size={32} />
                        <View className="flex-1">
                            <Text className="text-foreground text-subtitle" numberOfLines={1}>
                                {t(row.name)}
                            </Text>
                            <View className="flex-row items-center gap-1">
                                <HugeiconsIcon color={colors.income} icon={FlashIcon} size={10} />
                                <Text className="text-income text-footnote">{t("pro.hero.logged")}</Text>
                            </View>
                        </View>
                        <RowAmount amount={row.amount} code={DEMO_CURRENCY} income={false} isFuture={false} />
                    </Animated.View>
                ))}
            </Animated.View>
        </View>
    );
}
