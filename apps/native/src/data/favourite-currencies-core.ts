import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";

import type { Database } from "@/db/client";
import { toggleFavourite } from "@/domain/favourite-currencies";

import { Meta } from "./app-meta-core";

export const readFavourites = (db: Database) => Meta.get(db, "favouriteCurrencies");

// Every `appMeta` write schedules a widget republish (`affectsWidgets` matches the table, not the key), which is why a
// per-screen currency override stays in screen state and never comes through here.
export const writeFavourites = Effect.fn("FavouriteCurrencies.writeFavourites")(function* writeFavourites(
    db: Database,
    codes: readonly string[]
) {
    yield* Meta.set(db, "favouriteCurrencies", codes);
});

// Toggles run one at a time: the read-modify-write straddles a suspension, so a double-tap would lose one. A failed
// toggle releases its permit, so it does not poison the queue.
const toggles = Semaphore.makeUnsafe(1);

// Answers the list as it now stands, so the caller can tell an add refused at the limit without re-reading. The write
// is unconditional: it also flushes codes the catalogue has retired.
export const toggleFavouriteCurrency = Effect.fn("FavouriteCurrencies.toggleFavouriteCurrency")(
    function* toggleFavouriteCurrency(db: Database, code: string) {
        const next = toggleFavourite(yield* readFavourites(db), code);
        yield* writeFavourites(db, next);
        return next;
    },
    toggles.withPermits(1)
);
