import { Alert } from "react-native";

import { ChoiceRow, SettingsSection, ToggleRow } from "@/components/list/list-row";
import { ReminderTimeRow } from "@/components/settings/reminder-time-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import {
    clampTimeOfDay,
    enableReminderStep,
    formatTimeOfDay,
    REMINDER_CUSTOM,
    REMINDER_EVENING,
    REMINDER_MORNING,
    reminderTime,
} from "@/domain/reminder";
import type { TimeOfDay } from "@/domain/reminder";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { translateNow } from "@/i18n/runtime";
import { setDueReminders } from "@/lib/due-reminders";
import { openNotificationSettings, reminderPermission, requestReminderPermission } from "@/lib/reminders";
import { SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { setBoolSettingCommand, setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

const OPTIONS = [
    {
        detail: "settings.notifications.morningDetail",
        label: "settings.notifications.morning",
        value: REMINDER_MORNING,
    },
    {
        detail: "settings.notifications.eveningDetail",
        label: "settings.notifications.evening",
        value: REMINDER_EVENING,
    },
    { label: "settings.notifications.custom", value: REMINDER_CUSTOM },
] as const satisfies readonly {
    value: number;
    label: TranslationKey;
    detail?: TranslationKey;
}[];

function reportReminderFailure(cause: unknown): void {
    console.error("Reminder update failed", cause);
}

async function enableReminders(setShowNotifications: (value: boolean) => Promise<void>): Promise<void> {
    const existing = await reminderPermission();
    if (enableReminderStep(existing) === "open-settings") {
        Alert.alert(
            translateNow("settings.notifications.deniedTitle"),
            translateNow("settings.notifications.deniedBody"),
            [
                {
                    style: "cancel",
                    text: translateNow("settings.notifications.notNow"),
                },
                {
                    onPress: openNotificationSettings,
                    text: translateNow("settings.notifications.openSettings"),
                },
            ]
        );
        return;
    }

    const granted = existing === "granted" ? existing : await requestReminderPermission();
    if (granted !== "granted") {
        return;
    }

    await setShowNotifications(true);
}

async function disableReminders(setShowNotifications: (value: boolean) => Promise<void>): Promise<void> {
    await setShowNotifications(false);
}

export function Notifications() {
    const db = useDatabase();
    const setBool = useAtomCommand(setBoolSettingCommand, SILENT);
    const setNumber = useAtomCommand(setNumberSettingCommand, SILENT);

    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const { state: settings } = useAppSettings();
    const enabled = settings.bool("showNotifications");
    const subscriptionsEnabled = settings.bool("subscriptionReminders");
    const installmentsEnabled = settings.bool("installmentReminders");
    const option = settings.number("notificationOption");
    const custom = clampTimeOfDay(settings.number("notificationHour"), settings.number("notificationMinute"));
    const scheduled = reminderTime(option, custom);

    const setShowNotifications = (value: boolean) =>
        setBool({ db, key: "showNotifications", value }).then(unwrapAtomCommand);

    const chooseOption = (next: number) => {
        setNumber({ db, key: "notificationOption", value: next }).then(unwrapAtomCommand).catch(reportReminderFailure);
    };

    const chooseTime = ({ hour, minute }: TimeOfDay) => {
        Promise.all([
            setNumber({ db, key: "notificationHour", value: hour }).then(unwrapAtomCommand),
            setNumber({ db, key: "notificationMinute", value: minute }).then(unwrapAtomCommand),
        ]).catch(reportReminderFailure);
    };

    return (
        <SettingsScreen>
            <SettingsSection footer={t("settings.notifications.footer")} title={t("settings.notifications.section")}>
                <ToggleRow
                    icon="Notification03"
                    onValueChange={(next) => {
                        (next ? enableReminders(setShowNotifications) : disableReminders(setShowNotifications)).catch(
                            reportReminderFailure
                        );
                    }}
                    title={t("settings.notifications.toggle")}
                    value={enabled}
                />
            </SettingsSection>

            {enabled ? (
                <SettingsSection
                    footer={t("settings.notifications.nextAt", {
                        time: formatTimeOfDay(scheduled, use24Hour, language),
                    })}
                    title={t("settings.notifications.whenSection")}
                >
                    {OPTIONS.map((choice) => (
                        <ChoiceRow
                            detail={
                                "detail" in choice
                                    ? t(choice.detail, {
                                          time: formatTimeOfDay(
                                              reminderTime(choice.value, custom),
                                              use24Hour,
                                              language
                                          ),
                                      })
                                    : undefined
                            }
                            key={choice.value}
                            label={t(choice.label)}
                            onPress={() => chooseOption(choice.value)}
                            selected={option === choice.value}
                        />
                    ))}
                    {option === REMINDER_CUSTOM ? <ReminderTimeRow onChange={chooseTime} value={custom} /> : null}
                </SettingsSection>
            ) : null}

            <SettingsSection
                footer={t("settings.notifications.subscriptionFooter")}
                title={t("settings.notifications.subscriptionSection")}
            >
                <ToggleRow
                    icon="CalendarClock"
                    onValueChange={(next) => {
                        setDueReminders(db, "subscriptionReminders", next).catch(reportReminderFailure);
                    }}
                    title={t("settings.notifications.subscriptionToggle")}
                    value={subscriptionsEnabled}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.notifications.installmentFooter")}
                title={t("settings.notifications.installmentSection")}
            >
                <ToggleRow
                    icon="CreditCard"
                    onValueChange={(next) => {
                        setDueReminders(db, "installmentReminders", next).catch(reportReminderFailure);
                    }}
                    title={t("settings.notifications.installmentToggle")}
                    value={installmentsEnabled}
                />
            </SettingsSection>
        </SettingsScreen>
    );
}
