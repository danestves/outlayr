import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import Notification03Icon from "@hugeicons-pro/core-stroke-rounded/Notification03Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNotificationDebts } from "@/data/notification-debts";
import { useLanguage, useTranslation } from "@/i18n/context";
import { pushedDebtHref } from "@/lib/notification-taps";
import { pushedDebtRow } from "@/screens/debts/pushed-debt";
import { dropNotificationDebtCommand } from "@/state/debt-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

const PRESSED_ALPHA = 0.1;
const TILE_RADIUS = 10;
const GLYPH = 18;
const DISMISS_GLYPH = 18;

export function PushedDebts({ currency }: { currency: string }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const m3 = useMaterialColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const drafts = useNotificationDebts(db);
    const dismiss = useAtomAction(dropNotificationDebtCommand);

    if (drafts.length === 0) {
        return null;
    }
    return (
        <>
            <View className="px-4 pt-4 pb-2">
                <Eyebrow colors={colors}>{t("debts.pushed.title")}</Eyebrow>
            </View>
            {drafts.map((draft) => {
                const row = pushedDebtRow(draft, { currency, language, showCents, t });
                return (
                    <View
                        className="border-m3-outline-variant bg-m3-surface min-h-18 flex-row items-center border-b"
                        key={draft.id}
                    >
                        <Pressable
                            accessibilityLabel={`${row.title}, ${row.subtitle}`}
                            accessibilityRole="button"
                            accessibilityValue={{ text: row.amount }}
                            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                            className="min-h-18 flex-1 flex-row items-center gap-4 py-2 pl-4"
                            onPress={() => router.push(pushedDebtHref(draft))}
                        >
                            <View
                                className="items-center justify-center"
                                style={{
                                    backgroundColor: withAlpha(m3.onSurfaceVariant, TILE_WASH_OPACITY),
                                    borderRadius: TILE_RADIUS,
                                    height: PARENT_TILE,
                                    width: PARENT_TILE,
                                }}
                            >
                                <HugeiconsIcon color={m3.onSurfaceVariant} icon={Notification03Icon} size={GLYPH} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-body text-m3-on-surface" numberOfLines={1}>
                                    {row.title}
                                </Text>
                                <Text className="text-caption text-m3-on-surface-variant" numberOfLines={1}>
                                    {row.subtitle}
                                </Text>
                            </View>
                            <Text
                                className={`font-sans-medium text-body tabular-nums ${row.positive ? "text-income" : "text-m3-on-surface"}`}
                                numberOfLines={1}
                            >
                                {row.amount}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("debts.pushed.dismiss")}
                            accessibilityRole="button"
                            android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                            className="size-12 items-center justify-center"
                            onPress={() => dismiss({ db, id: draft.id })}
                        >
                            <HugeiconsIcon color={m3.onSurfaceVariant} icon={Cancel01Icon} size={DISMISS_GLYPH} />
                        </Pressable>
                    </View>
                );
            })}
        </>
    );
}
