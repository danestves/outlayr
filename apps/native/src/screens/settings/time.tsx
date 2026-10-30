import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";
import type { CalendarSettings } from "@outlayr/money/calendar";

import { SettingsSection } from "@/components/list/list-row";
import { MonthRow } from "@/components/settings/month-day-grid";
import { SegmentedRow } from "@/components/settings/segmented-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { WEEKDAY_OPTIONS } from "@/data/settings-core";
import { formatSentenceDate } from "@/domain/dates";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { setBoolSettingCommand, setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";

const CLOCK_OPTIONS: readonly { label: TranslationKey; value: number }[] = [
    { label: "clock.twelveHour", value: 0 },
    { label: "clock.twentyFourHour", value: 1 },
];

function currentRangeLabel(type: number, calendar: CalendarSettings, language: Language) {
    const start = startOfPeriod(new Date(), type, calendar);
    const last = addDays(periodEnd(start, type), -1);
    return `${formatSentenceDate(start, language)} – ${formatSentenceDate(last, language)}`;
}

export function TimeFrames() {
    const db = useDatabase();
    const setBoolSetting = useAtomAction(setBoolSettingCommand);
    const setNumberSetting = useAtomAction(setNumberSettingCommand);
    const t = useTranslation();
    const { language } = useLanguage();
    const { state: settings } = useAppSettings();
    const firstWeekday = settings.number("firstWeekday");
    const firstDayOfMonth = settings.number("firstDayOfMonth");
    // Displayed and overridden here; the device's convention is seeded at the root.
    const { use24Hour: use24HourClock } = useDisplaySettings().state;

    return (
        <SettingsScreen>
            <SettingsSection footer={t("settings.time.reopenNote")} title={t("settings.time.startsSection")}>
                <SegmentedRow
                    icon="Calendar01"
                    onChange={(next) => {
                        setNumberSetting({ db, key: "firstWeekday", value: next });
                    }}
                    options={WEEKDAY_OPTIONS.map((option) => ({
                        label: t(option.label),
                        note: t("settings.time.weekNote", {
                            range: currentRangeLabel(
                                BUDGET_TYPE.week,
                                { firstDayOfMonth, firstWeekday: option.value },
                                language
                            ),
                        }),
                        value: option.value,
                    }))}
                    title={t("settings.time.week")}
                    value={firstWeekday}
                />
                <MonthRow
                    icon="Calendar03"
                    note={t("settings.time.monthNote", {
                        range: currentRangeLabel(BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday }, language),
                    })}
                    onChange={(next) => {
                        setNumberSetting({ db, key: "firstDayOfMonth", value: next });
                    }}
                    title={t("settings.time.month")}
                    value={firstDayOfMonth}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.time.formatSection")}>
                <SegmentedRow
                    icon="Clock01"
                    onChange={(next) => {
                        setBoolSetting({ db, key: "use24HourClock", value: next === 1 });
                    }}
                    options={CLOCK_OPTIONS.map((option) => ({
                        label: t(option.label),
                        note: t("clock.deviceNote"),
                        value: option.value,
                    }))}
                    title={t("clock.section")}
                    value={use24HourClock ? 1 : 0}
                />
            </SettingsSection>
        </SettingsScreen>
    );
}
