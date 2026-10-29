import { useRouter } from "expo-router";
import { View } from "react-native";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useAutologUsage } from "@/data/autolog-cap";
import { formatSentenceDate } from "@/domain/dates";
import { paywallHref } from "@/domain/paywall-trigger";
import { formatWait, projectLimit } from "@/domain/usage-limits";
import type { LimitBucket } from "@/domain/usage-limits";
import { proSellable, useProLocked } from "@/hooks/use-pro-locked";
import { useTickingNow, useUsageLimits } from "@/hooks/use-usage-limits";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";

export function Usage() {
    const { accountId } = useAuthSession();
    return accountId === null ? <SettingsScreen>{null}</SettingsScreen> : <UsageLimitsView />;
}

function UsageLimitsView() {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const limits = useUsageLimits();
    const now = useTickingNow(true);
    const autolog = useAutologUsage(useDatabase());
    const locked = useProLocked();

    if (!limits) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }

    const captures = projectLimit(limits.captures, now);
    const rows: { bucket: LimitBucket; icon: SettingsIconName; title: TranslationKey }[] = [
        { bucket: limits.receiptScan, icon: "Camera01", title: "settings.usage.receipts" },
        { bucket: limits.voiceEntry, icon: "Mic01", title: "settings.usage.voice" },
        { bucket: limits.enrichment, icon: "Sparkles", title: "settings.usage.suggestions" },
    ];
    if (limits.csvImport) {
        rows.push({ bucket: limits.csvImport, icon: "FileImport", title: "settings.usage.imports" });
    }

    return (
        <SettingsScreen>
            <View className="gap-2 pt-6">
                <Text className="text-foreground tracking-hero text-hero font-sans tabular-nums">
                    {captures.left}
                    <Text className="text-muted text-title font-sans">
                        {` ${t("settings.usage.captures", { count: captures.capacity })}`}
                    </Text>
                </Text>
                <View className="flex-row justify-between gap-4">
                    <Text className="text-muted text-subtitle">{t("settings.usage.capturesKinds")}</Text>
                    {captures.fullAt === null ? null : (
                        <Text className="text-muted text-subtitle tabular-nums">
                            {t("settings.usage.resets", {
                                date: formatSentenceDate(new Date(captures.fullAt), language),
                            })}
                        </Text>
                    )}
                </View>
            </View>

            {!limits.pro && proSellable() ? (
                <View className="border-border mt-4 border-t">
                    <LinkRow
                        icon="Sparkles"
                        onPress={() => router.push(paywallHref("usage"))}
                        title={t("pro.entry.title")}
                        value={t("pro.entry.value")}
                    />
                </View>
            ) : null}

            {locked ? (
                <SettingsSection title={t("settings.usage.thisMonth")}>
                    <LinkRow
                        icon="Wallet01"
                        title={t("settings.usage.autolog")}
                        value={`${autolog.used} / ${autolog.cap}`}
                    />
                </SettingsSection>
            ) : null}

            <SettingsSection title={t("settings.usage.thisHour")}>
                {rows.map((row) => {
                    const projection = projectLimit(row.bucket, now);
                    return (
                        <LinkRow
                            detail={
                                projection.fullAt === null
                                    ? undefined
                                    : t("settings.usage.fullIn", { time: formatWait(projection.fullAt - now) })
                            }
                            icon={row.icon}
                            key={row.title}
                            title={t(row.title)}
                            value={`${projection.left} / ${projection.capacity}`}
                        />
                    );
                })}
            </SettingsSection>
        </SettingsScreen>
    );
}
