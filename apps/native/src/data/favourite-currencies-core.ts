import type { Database } from "@/db/client";
import { parseFavourites, serialiseFavourites, toggleFavourite } from "@/domain/favourite-currencies";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

export async function readFavourites(db: Database): Promise<string[]> {
    return parseFavourites(await getMeta(db, META_KEYS.favouriteCurrencies));
}

// Every `appMeta` write schedules a widget republish (`affectsWidgets` matches the table, not the key), which is why a
// per-screen currency override stays in screen state and never comes through here.
export async function writeFavourites(db: Database, codes: readonly string[]): Promise<void> {
    await setMeta(db, META_KEYS.favouriteCurrencies, serialiseFavourites(codes));
}

// Toggles run one at a time: the read-modify-write straddles an `await`, so a double-tap would lose one.
let queue: Promise<unknown> = Promise.resolve();

// Answers the list as it now stands, so the caller can tell an add refused at the limit without re-reading. The write
// is unconditional: it also flushes codes the catalogue has retired.
export function toggleFavouriteCurrency(db: Database, code: string): Promise<string[]> {
    const run = queue.then(async () => {
        const next = toggleFavourite(await readFavourites(db), code);
        await writeFavourites(db, next);
        return next;
    });
    queue = run.catch(() => {
        // Swallowed so one failed write does not poison the queue.
    });
    return run;
}
