import { useAtomMount } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Semaphore from "effect/Semaphore";

import { useRevenueCat } from "@/contexts/revenuecat-context";
import { formatChargeDate } from "@/domain/dates";
import { TRIAL_REMINDER_LEAD_DAYS, trialReminderAt } from "@/domain/pro-status";
import { translateNow } from "@/i18n/runtime";

import { Reminders } from "./reminders";
import { onCustomerInfoUpdated, proTerm } from "./revenuecat";
import { warnAndContinue } from "./warn-and-continue";

// Its own namespace, so no other reminder sync's prefix sweep cancels it.
const TRIAL_REMINDER_ID = "outlayr.pro-trial-ending";

const reconcile = Effect.fn("TrialReminder.reconcile")(function* reconcile(ask: boolean) {
    const reminders = yield* Reminders;
    const { status } = yield* proTerm();
    const now = new Date();
    const fireAt = status?.kind === "trial" ? trialReminderAt(status.on, now) : null;
    if (status?.kind !== "trial" || fireAt === null) {
        yield* reminders.cancel([TRIAL_REMINDER_ID]);
        return;
    }
    const existing = yield* reminders.permission();
    const permission = existing === "undetermined" && ask ? yield* reminders.request() : existing;
    if (permission !== "granted") {
        return;
    }
    yield* reminders.schedule({
        body: translateNow("pro.trialReminder.body", { date: formatChargeDate(status.on, now) }),
        data: { open: "pro" },
        fireAt,
        id: TRIAL_REMINDER_ID,
        title: translateNow("pro.trialReminder.title", { days: TRIAL_REMINDER_LEAD_DAYS }),
    });
});

const inFlight = Semaphore.makeUnsafe(1);

/**
 * Two days before a free trial turns paid, as the paywall's timeline promises. `ask` is for the moment the trial
 * starts: that is the one time the permission prompt has a reason the user just read.
 */
export const syncTrialReminder = Effect.fn("TrialReminder.sync")(function* syncTrialReminder(ask: boolean) {
    yield* reconcile(ask).pipe(inFlight.withPermits(1), warnAndContinue("[outlayr] trial reminder sync failed"));
});

/** Re-reads on every customer info change, so cancelling or converting the trial takes the reminder down. */
export const trialReminderAtom = Atom.family((isPro: boolean) =>
    Atom.make((get) => {
        if (!isPro) {
            return Effect.void;
        }
        get.addFinalizer(
            onCustomerInfoUpdated(() => {
                get.refreshSelf();
            })
        );
        return syncTrialReminder(false);
    }).pipe(Atom.withLabel("revenuecat:trial-reminder"))
);

export function TrialReminderSync() {
    useAtomMount(trialReminderAtom(useRevenueCat().kind === "pro"));
    return null;
}
