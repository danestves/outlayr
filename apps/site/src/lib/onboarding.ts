import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { LedgerBooks } from "./ledger-books";

export const ONBOARDING_STEPS = ["currency", "auto-log", "rhythm", "first-entry"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const Screen = Schema.Literals(["welcome", "import", "money-manager", ...ONBOARDING_STEPS, "done"]);
export type OnboardingScreen = typeof Screen.Type;

const Progress = Schema.Struct({
    begunAt: Schema.Number,
    finished: Schema.Boolean,
    /** The reminder is asked for after the first entry is saved, so the choice waits here. Null is no reminder. */
    reminderMinute: Schema.NullOr(Schema.Number),
    screen: Screen,
});
export type OnboardingProgress = typeof Progress.Type;

const decodeProgress = Schema.decodeUnknownOption(Schema.fromJsonString(Progress));
const decodeScreen = Schema.decodeUnknownOption(Screen);

export const DEFAULT_REMINDER_MINUTE = 1230;

const STEP_ORDER: readonly OnboardingScreen[] = ONBOARDING_STEPS;

/** Where a screen sits among the steps: -1 before them, their count once they are done. */
export function stepIndex(screen: OnboardingScreen) {
    if (screen === "done") {
        return ONBOARDING_STEPS.length;
    }
    return STEP_ORDER.indexOf(screen);
}

export const screenOf = (step: string | undefined): OnboardingScreen | null => Option.getOrNull(decodeScreen(step));

export const freshProgress = (begunAt: number): OnboardingProgress => ({
    begunAt,
    finished: false,
    reminderMinute: DEFAULT_REMINDER_MINUTE,
    screen: "welcome",
});

interface GateBooks {
    accounts: { readonly length: number };
    appMeta: readonly Pick<LedgerBooks["appMeta"][number], "key" | "value">[];
    transactions: { readonly length: number };
}

/** A ledger nobody has written in: no phone has synced into it and the web has not asked its currency. */
export const isFreshLedger = (books: GateBooks) =>
    books.accounts.length === 0 &&
    books.transactions.length === 0 &&
    !books.appMeta.some((row) => row.key === "currencyChosen" && row.value === "true");

/** Started here and not finished, or never started on a ledger that is still empty. */
export const onboardingDue = (progress: OnboardingProgress | null, books: GateBooks) =>
    progress === null ? isFreshLedger(books) : !progress.finished;

const keyOf = (userId: string | undefined) => `outlayr.onboarding.${userId ?? "signed-out"}`;
const CHANGED = "outlayr:onboarding";

// Private mode refuses the write, and the flow must still reach its end from memory.
const memory = new Map<string, string>();

function storedRaw(key: string) {
    try {
        return localStorage.getItem(key) ?? memory.get(key) ?? null;
    } catch {
        return memory.get(key) ?? null;
    }
}

// useSyncExternalStore needs the same object back until the stored text changes.
let cachedRaw: string | null = null;
let cachedProgress: OnboardingProgress | null = null;

export function readProgress(userId: string | undefined): OnboardingProgress | null {
    const raw = storedRaw(keyOf(userId));
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedProgress = raw === null ? null : Option.getOrNull(decodeProgress(raw));
    }
    return cachedProgress;
}

export function writeProgress(userId: string | undefined, progress: OnboardingProgress) {
    const raw = JSON.stringify(progress);
    memory.set(keyOf(userId), raw);
    try {
        localStorage.setItem(keyOf(userId), raw);
    } catch {
        // Kept in memory above.
    }
    window.dispatchEvent(new Event(CHANGED));
}

export function subscribeProgress(onChange: () => void) {
    window.addEventListener(CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGED, onChange);
        window.removeEventListener("storage", onChange);
    };
}
