import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";

import { createCommand } from "@/state/atom-command";

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
        Effect.catchTags({ TourStateError: () => Effect.succeed(null) })
    );
    if (raw === null) {
        return new Set<TourId>();
    }
    return knownTours(Option.getOrElse(decodeStoredTours(raw), () => []));
});

/** A failed write leaves this session's memory as the only record; the tour shows once more next launch. */
export const writeSeenTours = Effect.fn("Tour.write")(function* writeSeenTours(seen: ReadonlySet<TourId>) {
    yield* attempt("write", () => AsyncStorage.setItem(STORAGE_KEY, encodeStoredTours([...seen]))).pipe(
        Effect.catchTags({ TourStateError: () => Effect.void })
    );
});

const storedToursAtom = Atom.make(readSeenTours()).pipe(Atom.keepAlive, Atom.withLabel("tour:stored"));

/** This session's set once it changes, so a finish or replay never waits on the storage write. */
export const sessionToursAtom = Atom.make<ReadonlySet<TourId> | null>(null).pipe(
    Atom.keepAlive,
    Atom.withLabel("tour:session")
);

/** `null` until storage has been read. */
export const seenToursAtom = Atom.make((get): ReadonlySet<TourId> | null => {
    const session = get(sessionToursAtom);
    if (session) {
        return session;
    }
    const stored = get(storedToursAtom);
    return AsyncResult.isSuccess(stored) ? stored.value : null;
}).pipe(Atom.withLabel("tour:seen"));

export const writeSeenToursCommand = createCommand({ execute: writeSeenTours, label: "tour:write" });
