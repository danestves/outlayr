import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { DayTotal } from "@/components/amount-text";
import { EmptyState, useMark } from "@/components/empty-state";
import { SettingsSection, ToggleRow } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { cn } from "@/components/tw";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useUpcomingTransactions } from "@/data/log-filtered";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { UpcomingList } from "@/screens/log/components/log-upcoming";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

const TIMELINE_W = MARK_CEILING.insetRow;
const TIMELINE_H = 20;

function TimelineStops() {
    const ink = useMark();
    const colors = useColors();
    const mid = TIMELINE_H / 2;
    const today = TIMELINE_W * 0.5;

    return (
        <Svg height={TIMELINE_H} viewBox={`0 0 ${TIMELINE_W} ${TIMELINE_H}`} width={TIMELINE_W}>
            <Path d={`M1 ${mid} H${today}`} stroke={colors.foreground} strokeLinecap="round" strokeWidth={1.5} />
            <Circle cx={6} cy={mid} fill={ink.fill} r={2} />
            <Circle cx={12} cy={mid} fill={ink.fill} r={2} />
            <Path d={`M${today} ${mid} H${TIMELINE_W - 1}`} stroke={ink.edge} strokeDasharray="3 3" strokeWidth={1.5} />
            <Path
                d={`M${today} ${mid - 5} V${mid + 5}`}
                stroke={colors.foreground}
                strokeLinecap="round"
                strokeWidth={1.5}
            />
        </Svg>
    );
}

export function Upcoming() {
    const db = useDatabase();
    const setBoolSetting = useAtomAction(setBoolSettingCommand);
    const router = useRouter();
    const t = useTranslation();
    const { state: settings } = useAppSettings();
    const { showCents } = useDisplaySettings().state;
    const largeText = useAccessibilityTextSize();
    const { displayCurrency: currency, rates } = useValuation(db);
    const showUpcoming = settings.bool("showUpcoming");
    const showSoon = settings.bool("showUpcomingSoon");
    const nowMs = useNow();
    const scheduled = useUpcomingTransactions(db, nowMs, false);
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    // A row waiting on the undo toast is already gone as far as the figures go,
    // or the monthly cost keeps charging for a subscription the user just deleted.
    const upcoming = scheduled.rows.filter((row) => !goesWithPendingDelete(row, pendingId));
    const perMonth = monthlySubscriptionCost(upcoming, currency, rates, new Date(nowMs));

    return (
        <SettingsScreen>
            {upcoming.length === 0 ? (
                <View className="pt-4">
                    <EmptyState body={t("settings.upcoming.empty")} mark={<TimelineStops />} tier="insetRow" />
                </View>
            ) : (
                <View className="pt-2.5">
                    {perMonth.some((bucket) => bucket.transactionCount > 0) ? (
                        <View
                            className={cn(
                                "flex-row items-baseline justify-between gap-2 pb-4",
                                largeText && "flex-wrap"
                            )}
                        >
                            <MonoLabel>{t("log.upcoming.perMonth")}</MonoLabel>
                            <DayTotal showCents={showCents} sizeClass="text-body" totals={perMonth} />
                        </View>
                    ) : null}
                    <UpcomingList
                        currency={currency}
                        menuItems={(transaction) => openRowActions(transaction, true)}
                        nowMs={nowMs}
                        onPress={(id) => router.push(`/transactions/${id}`)}
                        rates={rates}
                        transactions={upcoming}
                    />
                </View>
            )}

            <SettingsSection footer={t("settings.upcoming.footer")} title={t("settings.upcoming.section")}>
                <ToggleRow
                    icon="Sunrise"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "showUpcoming", value: next });
                        if (!next) {
                            setBoolSetting({ db, key: "showUpcomingSoon", value: false });
                        }
                    }}
                    title={t("settings.upcoming.displayOnLog")}
                    value={showUpcoming}
                />
                <ToggleRow
                    icon="CalendarClock"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "showUpcomingSoon", value: next });
                    }}
                    title={t("settings.upcoming.limitToSoon")}
                    value={showSoon}
                />
            </SettingsSection>
        </SettingsScreen>
    );
}
