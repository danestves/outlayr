import { useRouter } from "expo-router";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { EmptyState, useMark } from "@/components/empty-state";
import { SettingsSection, ToggleRow } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useUpcomingTransactions } from "@/data/log-filtered";
import { setBoolSetting } from "@/data/settings-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { LogUpcoming } from "@/screens/log/components/log-upcoming";
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
    const router = useRouter();
    const t = useTranslation();
    const { state: settings } = useAppSettings();
    const { displayCurrency: currency, rates } = useValuation(db);
    const showUpcoming = settings.bool("showUpcoming");
    const showSoon = settings.bool("showUpcomingSoon");
    const nowMs = useNow();
    // Unlimited whatever the 14-day toggle says, the promise the footer above makes.
    const scheduled = useUpcomingTransactions(db, nowMs, false);
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    // A row waiting on the undo toast is already gone as far as the figures go,
    // or the monthly cost keeps charging for a subscription the user just deleted.
    const upcoming = scheduled.rows.filter((row) => !goesWithPendingDelete(row, pendingId));

    return (
        <SettingsScreen>
            <SettingsSection footer={t("settings.upcoming.footer")} title={t("settings.upcoming.section")}>
                <ToggleRow
                    icon="Sunrise"
                    onValueChange={(next) => {
                        setBoolSetting(db, "showUpcoming", next);
                        if (!next) {
                            setBoolSetting(db, "showUpcomingSoon", false);
                        }
                    }}
                    title={t("settings.upcoming.displayOnLog")}
                    value={showUpcoming}
                />
                <ToggleRow
                    icon="CalendarClock"
                    onValueChange={(next) => {
                        setBoolSetting(db, "showUpcomingSoon", next);
                    }}
                    title={t("settings.upcoming.limitToSoon")}
                    value={showSoon}
                />
            </SettingsSection>

            <View className="pt-4">
                <LogUpcoming
                    currency={currency}
                    nowMs={nowMs}
                    menuItems={(transaction) => openRowActions(transaction, true)}
                    onPress={(id) => router.push(`/transactions/${id}`)}
                    rates={rates}
                    schedules={upcoming}
                    transactions={upcoming}
                />
                {upcoming.length === 0 ? (
                    <EmptyState body={t("settings.upcoming.empty")} mark={<TimelineStops />} tier="insetRow" />
                ) : null}
            </View>
        </SettingsScreen>
    );
}
