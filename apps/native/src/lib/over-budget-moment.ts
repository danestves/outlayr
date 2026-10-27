import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

const STORAGE_KEY = "outlayr.over-budget-seen";
const REMEMBERED = 60;

const decodeSeenKeys = Schema.decodeUnknownOption(Schema.mutable(Schema.Array(Schema.String)));

export class OverBudgetMomentError extends Schema.TaggedError<OverBudgetMomentError>()("OverBudgetMomentError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["read", "save"]),
}) {
    override get message(): string {
        return `Over budget moment ${this.operation} failed`;
    }
}

const claimed = new Set<string>();
let stored: string[] | null = null;
const inFlight = Semaphore.makeUnsafe(1);

const load = Effect.tryPromise({
    catch: (cause) => new OverBudgetMomentError({ cause, operation: "read" }),
    try: () => AsyncStorage.getItem(STORAGE_KEY),
}).pipe(
    Effect.flatMap((raw) =>
        Effect.try({
            catch: (cause) => new OverBudgetMomentError({ cause, operation: "read" }),
            try: () => (raw ? JSON.parse(raw) : []),
        })
    ),
    Effect.map((parsed) => Option.getOrElse(decodeSeenKeys(parsed), () => [])),
    Effect.catchTags({ OverBudgetMomentError: () => Effect.succeed<string[]>([]) })
);

export function overBudgetMomentKey(budgetId: string, windowStart: Date): string {
    return `${budgetId}:${windowStart.getTime()}`;
}

export const claimOverBudgetMoment = Effect.fn("OverBudgetMoment.claim")(function* claimOverBudgetMoment(key: string) {
    if (claimed.has(key)) {
        return false;
    }
    claimed.add(key);
    return yield* Effect.gen(function* record() {
        stored ??= yield* load;
        const seen = stored;
        if (seen.includes(key)) {
            return false;
        }
        seen.push(key);
        seen.splice(0, Math.max(0, seen.length - REMEMBERED));
        yield* Effect.tryPromise({
            catch: (cause) => new OverBudgetMomentError({ cause, operation: "save" }),
            try: () => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seen)),
        });
        return true;
    }).pipe(inFlight.withPermits(1));
});
