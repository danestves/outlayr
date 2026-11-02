import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Account } from "@/data/accounts-core";
import { formatTime } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { cardCheckedTitle } from "../checked-wording";

const TILE_SIZE = 32;

interface CheckBalanceCardProps {
    account: Pick<Account, "checkedAt">;
    nowMs: number;
    onCheck: () => void;
}

export function CheckBalanceCard({ account, nowMs, onCheck }: CheckBalanceCardProps) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const { checkedAt } = account;
    const title = cardCheckedTitle(t, checkedAt, nowMs);
    const matched =
        checkedAt === null ? null : t("accounts.check.matched", { time: formatTime(checkedAt, use24Hour, language) });

    return (
        <View className="bg-surface w-full flex-row items-center gap-3 rounded-2xl p-3.5">
            <View
                className="items-center justify-center rounded-lg"
                style={{
                    backgroundColor: withAlpha(colors.income, TILE_WASH_OPACITY),
                    height: TILE_SIZE,
                    width: TILE_SIZE,
                }}
            >
                <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={18} />
            </View>
            <View className="flex-1">
                <Text className="text-body text-foreground" numberOfLines={1}>
                    {title}
                </Text>
                {matched === null ? null : (
                    <Text className="text-footnote text-muted" numberOfLines={1}>
                        {matched}
                    </Text>
                )}
            </View>
            <Pressable
                accessibilityRole="button"
                className="bg-foreground h-9 items-center justify-center rounded-full px-4 active:opacity-70"
                onPress={onCheck}
            >
                <Text className="font-sans-semibold text-background text-subtitle">{t("accounts.check.action")}</Text>
            </Pressable>
        </View>
    );
}
