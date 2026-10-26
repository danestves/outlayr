import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import { isReminderChosen } from "@/data/onboarding-core";
import { setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";

import { Reminders } from "./reminders";

const arm = Effect.fn("ChosenReminder.arm")(function* arm(db: Database) {
    const reminders = yield* Reminders;
    const [chosen, asked, stored] = yield* Effect.all(
        [getMeta(db, META_KEYS.reminderChosen), getMeta(db, META_KEYS.reminderAsked), getMeta(db, "showNotifications")],
        { concurrency: "unbounded" }
    );
    if (!isReminderChosen(chosen) || asked === "true") {
        return;
    }
    if (stored !== null) {
        // A switch set since the offer is the user's own answer and outranks the onboarding one.
        yield* setMeta(db, META_KEYS.reminderAsked, "true");
        return;
    }
    const existing = yield* reminders.permission();
    if (existing === "unknown") {
        // The read failed; the next save tries again rather than spending the ask.
        return;
    }
    yield* setMeta(db, META_KEYS.reminderAsked, "true");
    if (existing === "denied") {
        return;
    }
    const granted = existing === "granted" ? existing : yield* reminders.request();
    if (granted === "granted") {
        yield* setBoolSetting(db, "showNotifications", true);
    }
});

const inFlight = Semaphore.makeUnsafe(1);

/**
 * The OS prompt waits for the first saved entry, since iOS asks only once. Serial, so a save landing while the
 * prompt is up waits for its answer instead of asking twice.
 */
export const armChosenReminder = Effect.fn("ChosenReminder.armChosenReminder")(function* armChosenReminder(
    db: Database
) {
    yield* arm(db).pipe(inFlight.withPermits(1));
});
