import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { useState } from "react";
import { Alert } from "react-native";

import type { Database } from "@/db/client";
import { useTranslation } from "@/i18n/context";
import { openNotificationSettings } from "@/lib/reminders";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { logged } from "@/state/entry-save";
import { useAtomCommand } from "@/state/use-atom-command";

import { CustomScheduleSheet, intervalPhrase } from "../custom-schedule-sheet";
import { confirmRemindersAllowed } from "./entry-flows";
import type { EntryForm } from "./form-values";
import type { SentenceVerb } from "./sentence/fact-glyphs";
import type { StageNavigation, StageStepContent } from "./stage/stage-steps";
import { StepDate } from "./stage/step-date";
import { StepRepeat } from "./stage/step-repeat";

interface EntryScheduleOptions {
    coefficient: number;
    date: Date;
    db: Database;
    endDate: Date;
    form: Pick<EntryForm, "setFieldValue">;
    hasEndDate: boolean;
    isSubscription: boolean;
    leadDays: number | null;
    recurringType: number;
    stage: StageNavigation;
}

export function useEntrySchedule({
    coefficient,
    date,
    db,
    endDate,
    form,
    hasEndDate,
    isSubscription,
    leadDays,
    recurringType,
    stage,
}: EntryScheduleOptions) {
    const t = useTranslation();
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const [sheetOpen, setSheetOpen] = useState(false);
    const interval = isSubscription ? intervalPhrase(t, recurringType, coefficient) : null;

    const confirmLead = () => {
        void runFlow(
            confirmRemindersAllowed(db, {
                onDeclined: () => form.setFieldValue("leadDays", null),
                onDenied: () => {
                    Alert.alert(t("settings.notifications.deniedTitle"), t("settings.notifications.deniedBody"), [
                        { style: "cancel", text: t("settings.notifications.notNow") },
                        {
                            onPress: openNotificationSettings,
                            text: t("settings.notifications.openSettings"),
                        },
                    ]);
                    form.setFieldValue("leadDays", null);
                },
            }).pipe(logged("Reminder permission check failed"))
        );
    };

    const handleLeadChange = (lead: number | null) => {
        form.setFieldValue("leadDays", lead);
        if (lead !== null && isSubscription) {
            confirmLead();
        }
    };

    const startRepeating = (type: number, every: number) => {
        form.setFieldValue("recurringType", type);
        form.setFieldValue("coefficient", every);
        form.setFieldValue("isSubscription", true);
        if (!isSubscription && leadDays !== null) {
            confirmLead();
        }
    };

    const repeatChipLabel = () => {
        if (recurringType === RECURRING_TYPE.daily) {
            return t("transaction.sentence.set.repeatDaily");
        }
        if (recurringType === RECURRING_TYPE.weekly) {
            return t("transaction.sentence.set.repeatWeekly");
        }
        if (recurringType === RECURRING_TYPE.yearly) {
            return t("transaction.sentence.set.repeatYearly");
        }
        return t("transaction.sentence.set.repeatMonthly");
    };

    const steps = {
        endDate: (): StageStepContent => ({
            body: (
                <StepDate
                    date={endDate}
                    onChange={(next) => {
                        form.setFieldValue("endDate", next);
                        form.setFieldValue("hasEndDate", true);
                    }}
                />
            ),
            rightAction: {
                label: t("common.never"),
                onPress: () => {
                    form.setFieldValue("hasEndDate", false);
                    stage.leave("repeat");
                },
            },
            title: t("transaction.field.ends"),
        }),
        repeat: (): StageStepContent => ({
            body: (
                <StepRepeat
                    cadence={isSubscription ? recurringType : RECURRING_TYPE.none}
                    custom={coefficient !== 1}
                    customLabel={
                        coefficient === 1
                            ? undefined
                            : t("transaction.schedule.every", {
                                  interval: intervalPhrase(t, recurringType, coefficient),
                              })
                    }
                    endDate={hasEndDate ? endDate : null}
                    labels={{
                        ending: t("transaction.schedule.ending"),
                        endingOpen: t("transaction.schedule.endingOpen"),
                        openEnd: t("transaction.schedule.openEnd"),
                        starting: t("transaction.schedule.starting"),
                    }}
                    leadDays={leadDays}
                    onCadenceChange={(type) => startRepeating(type, 1)}
                    onCustomPress={() => setSheetOpen(true)}
                    onEndDatePress={() => stage.enter("endDate")}
                    onLeadChange={handleLeadChange}
                    onStartDatePress={() => stage.enter("date")}
                    startDate={date}
                />
            ),
            title: t("transaction.field.schedule"),
        }),
    };

    const verb: SentenceVerb = {
        accessibilityLabel: interval === null ? undefined : t("transaction.schedule.every", { interval }),
        active: isSubscription,
        key: "repeat",
        label: isSubscription ? repeatChipLabel() : t("transaction.sentence.add.repeat"),
        onPress: () => stage.enter("repeat"),
        onRemove: () => form.setFieldValue("isSubscription", false),
        removeAccessibilityLabel: t("transaction.schedule.stopRepeat"),
    };

    const sheet = (
        <CustomScheduleSheet
            firstPayment={date}
            onDone={startRepeating}
            onOpenChange={setSheetOpen}
            open={sheetOpen}
            recurringCoefficient={coefficient}
            recurringType={recurringType}
        />
    );

    return { interval, sheet, steps, verb };
}
