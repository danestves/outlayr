import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "outlayr.over-budget-seen";
const REMEMBERED = 60;

const SeenKeys = Schema.fromJsonString(Schema.mutable(Schema.Array(Schema.String)));
const decodeSeenKeys = Schema.decodeUnknownOption(SeenKeys);
const encodeSeenKeys = Schema.encodeSync(SeenKeys);

export class OverBudgetMomentError extends Schema.TaggedError<OverBudgetMomentError>()("OverBudgetMomentError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["read", "save"]),
}) {
    override get message(): string {
        return `Over budget moment ${this.operation} failed`;
    }
}

const claimed = new Set<string>();
let stored: readonly string[] | null = null;
const listeners = new Set<() => void>();
const inFlight = Semaphore.makeUnsafe(1);

function commit(next: readonly string[]) {
    stored = next;
    for (const listener of listeners) {
        listener();
    }
}

const load = Effect.tryPromise({
    catch: (cause) => new OverBudgetMomentError({ cause, operation: "read" }),
    try: () => AsyncStorage.getItem(STORAGE_KEY),
}).pipe(
    Effect.map((raw) => (raw === null ? [] : Option.getOrElse(decodeSeenKeys(raw), () => []))),
    Effect.catchTags({ OverBudgetMomentError: () => Effect.succeed<string[]>([]) })
);

const ensureLoaded = Effect.gen(function* loadOnce() {
    if (stored === null) {
        commit(yield* load);
    }
}).pipe(inFlight.withPermits(1));

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (stored === null) {
        Effect.runFork(ensureLoaded);
    }
    return () => {
        listeners.delete(listener);
    };
}

export function useSeenOverBudgetMoments(): readonly string[] | null {
    return useSyncExternalStore(subscribe, () => stored);
}

export function overBudgetMomentKey(budgetId: string, windowStart: Date): string {
    return `${budgetId}:${windowStart.getTime()}`;
}

export const claimOverBudgetMoment = Effect.fn("OverBudgetMoment.claim")(function* claimOverBudgetMoment(key: string) {
    if (claimed.has(key)) {
        return false;
    }
    claimed.add(key);
    return yield* Effect.gen(function* record() {
        const seen = stored ?? (yield* load);
        if (seen.includes(key)) {
            if (stored === null) {
                commit(seen);
            }
            return false;
        }
        const next = [...seen, key].slice(-REMEMBERED);
        commit(next);
        yield* Effect.tryPromise({
            catch: (cause) => new OverBudgetMomentError({ cause, operation: "save" }),
            try: () => AsyncStorage.setItem(STORAGE_KEY, encodeSeenKeys(next)),
        });
        return true;
    }).pipe(inFlight.withPermits(1));
});
