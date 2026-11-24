import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const STORAGE_KEY = "outlayr.tour";

const TourIdSchema = Schema.Literals(["log", "balances", "insights", "settings"]);

export type TourId = typeof TourIdSchema.Type;

const readTourId = Schema.decodeUnknownOption(TourIdSchema);
const StoredTours = Schema.fromJsonString(Schema.mutable(Schema.Array(Schema.String)));
const decodeStoredTours = Schema.decodeUnknownOption(StoredTours);
const encodeStoredTours = Schema.encodeSync(StoredTours);

export class TourStateError extends Schema.TaggedError<TourStateError>()("TourStateError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["read", "write"]),
}) {
    override get message(): string {
        return `Tour state ${this.operation} failed`;
    }
}

const attempt = <A>(operation: "read" | "write", run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new TourStateError({ cause, operation }), try: run });

function knownTours(ids: readonly string[]): ReadonlySet<TourId> {
    const seen = new Set<TourId>();
    for (const id of ids) {
        const tour = readTourId(id);
        if (Option.isSome(tour)) {
            seen.add(tour.value);
        }
    }
    return seen;
}

/** A failed read is an empty set: the tour shows again rather than the app refusing to start. */
export const readSeenTours = Effect.fn("Tour.read")(function* readSeenTours() {
    const raw = yield* attempt("read", () => AsyncStorage.getItem(STORAGE_KEY)).pipe(
        Effect.catch(() => Effect.succeed(null))
    );
    if (raw === null) {
        return new Set<TourId>();
    }
    return knownTours(Option.getOrElse(decodeStoredTours(raw), () => []));
});

/** A failed write leaves this session's memory as the only record; the tour shows once more next launch. */
export const writeSeenTours = Effect.fn("Tour.write")(function* writeSeenTours(seen: ReadonlySet<TourId>) {
    yield* attempt("write", () => AsyncStorage.setItem(STORAGE_KEY, encodeStoredTours([...seen]))).pipe(
        Effect.catch(() => Effect.void)
    );
});
