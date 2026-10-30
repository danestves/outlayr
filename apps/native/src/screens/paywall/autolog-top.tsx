import { View } from "react-native";

import { RowAmount } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import type { useAutologUsage } from "@/data/autolog-cap";
import { useNow } from "@/data/use-now";
import { formatDayHeader } from "@/domain/dates";
import { detectCurrency } from "@/domain/detect-currency";
import { useLanguage, useTranslation } from "@/i18n/context";
import { autologSourceOf } from "@/lib/pending-writes-core";
import type { PendingWrite } from "@/lib/pending-writes-core";

import { meterSegments } from "./top-block";

const SHOWN_WAITING = 3;

function WaitingRow({ fallbackCurrency, write }: { fallbackCurrency: string; write: PendingWrite }) {
    const nowMs = useNow();
    const t = useTranslation();
    const { language } = useLanguage();
    const code = write.currency?.trim().toUpperCase() || detectCurrency(write.amountText) || fallbackCurrency;
    const source = t(`pro.top.autolog.source.${autologSourceOf(write)}`);
    const day = formatDayHeader(new Date(write.date), new Date(nowMs), language);
    return (
        <View className="border-border flex-row items-center gap-3 border-b py-2.5">
            <View className="flex-1">
                <Text className="text-foreground text-subtitle" numberOfLines={1}>
                    {write.note}
                </Text>
                <Text className="text-muted text-footnote" numberOfLines={1}>
                    {`${source} · ${day}`}
                </Text>
            </View>
            <RowAmount amount={Math.abs(write.amount)} code={code} income={write.income} isFuture={false} />
        </View>
    );
}

export function AutologTop({ usage }: { usage: ReturnType<typeof useAutologUsage> }) {
    const t = useTranslation();
    const fallbackCurrency = useGlobalCurrency(useDatabase());
    const { cap, queued, used, waiting } = usage;
    const segments = meterSegments(used, waiting);
    const caption =
        waiting > 0
            ? t("pro.top.autolog.meterWaiting", { cap, used, waiting })
            : t("pro.top.autolog.meter", { cap, used });
    return (
        <View className="pt-2">
            <MonoLabel>{t("pro.top.autolog.eyebrow")}</MonoLabel>
            <Text className="text-foreground text-title font-sans-semibold pt-2 tracking-tight">
                {t("pro.top.autolog.title", { count: used })}
            </Text>
            <View accessibilityLabel={caption} accessible className="flex-row gap-1 pt-4">
                {Array.from({ length: segments.filled }, (_, index) => (
                    <View className="bg-foreground h-2 flex-1 rounded-full" key={`used-${index}`} />
                ))}
                {Array.from({ length: segments.waiting }, (_, index) => (
                    <View className="bg-tint/40 h-2 flex-1 rounded-full" key={`waiting-${index}`} />
                ))}
            </View>
            <Text className="text-muted text-footnote pt-2 tabular-nums">{caption}</Text>
            {queued.length === 0 ? null : (
                <View className="border-border mt-3 border-t">
                    {queued.slice(0, SHOWN_WAITING).map((write) => (
                        <WaitingRow fallbackCurrency={fallbackCurrency} key={write.id} write={write} />
                    ))}
                </View>
            )}
        </View>
    );
}
