import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";

import { Meta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";

import { freshEntries } from "./fresh-entries";
import { Reminders } from "./reminders";

const arm = Effect.fn("ChosenReminder.arm")(function* arm(db: Database) {
    const reminders = yield* Reminders;
    const [chosen, asked, answered] = yield* Effect.all(
        [Meta.get(db, "reminderChosen"), Meta.get(db, "reminderAsked"), Meta.has(db, "showNotifications")],
        { concurrency: "unbounded" }
    );
    if (!chosen || asked) {
        return;
    }
    if (answered) {
        // A switch set since the offer is the user's own answer and outranks the onboarding one.
        yield* Meta.set(db, "reminderAsked", true);
        return;
    }
    const existing = yield* reminders.permission();
    if (existing === "unknown" || freshEntries.arriving()) {
        // The read failed or a row is still arriving; the next save tries again rather than spending the ask.
        return;
    }
    yield* Meta.set(db, "reminderAsked", true);
    if (existing === "denied") {
        return;
    }
    const granted = existing === "granted" ? existing : yield* reminders.request();
    if (granted === "granted") {
        yield* Meta.set(db, "showNotifications", true);
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
