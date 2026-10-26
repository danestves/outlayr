import { useAtomMount } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { SyncEngine } from "./sync-engine";

export const syncEngineAtom = Atom.family((db: Database) =>
    appRuntime.atom(SyncEngine.pipe(Effect.flatMap((engine) => engine.run(db)))).pipe(Atom.withLabel("sync:engine"))
);

/** Unmounted while paused, so every trigger is held while the outbox keeps queueing. */
export function SyncEngineMount({ db }: { db: Database }) {
    useAtomMount(syncEngineAtom(db));
    return null;
}
