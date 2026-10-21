import { ChoiceRow, PickerRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { ordinalDay, setBoolSetting, setNumberSetting } from "@/data/settings-core";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";

const WEEKDAY_OPTIONS: readonly { label: TranslationKey; value: number }[] = [
    { label: "settings.time.sunday", value: 1 },
    { label: "settings.time.monday", value: 2 },
];

const CLOCK_OPTIONS: readonly { label: TranslationKey; value: boolean }[] = [
    { label: "clock.twelveHour", value: false },
    { label: "clock.twentyFourHour", value: true },
];

const MONTH_DAYS = Array.from({ length: 28 }, (_, index) => index + 1);

export function TimeFrames() {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const { state: settings } = useAppSettings();
    const firstWeekday = settings.number("firstWeekday");
    const firstDayOfMonth = settings.number("firstDayOfMonth");
    // Displayed and overridden here; the device's convention is seeded at the root.
    const { use24Hour: use24HourClock } = useDisplaySettings().state;

    return (
        <SettingsScreen>
            <SettingsSection footer={t("clock.deviceNote")} title={t("settings.time.startsSection")}>
                <PickerRow
                    icon="CalendarClock"
                    onChange={(next) => {
                        setBoolSetting(db, "use24HourClock", next);
                    }}
                    options={CLOCK_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    title={t("clock.section")}
                    value={use24HourClock}
                />
                <PickerRow
                    icon="Calendar01"
                    onChange={(next) => {
                        setNumberSetting(db, "firstWeekday", next);
                    }}
                    options={WEEKDAY_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    title={t("settings.time.weekSection")}
                    value={firstWeekday}
                />
            </SettingsSection>

            <SettingsSection footer={t("settings.time.reopenNote")} title={t("settings.time.monthSection")}>
                {MONTH_DAYS.map((day) => (
                    <ChoiceRow
                        key={day}
                        label={t("settings.time.dayOfMonth", {
                            day: ordinalDay(day, language),
                        })}
                        onPress={() => {
                            setNumberSetting(db, "firstDayOfMonth", day);
                        }}
                        selected={firstDayOfMonth === day}
                    />
                ))}
            </SettingsSection>
        </SettingsScreen>
    );
}
