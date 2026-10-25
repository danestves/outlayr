import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Atom from "effect/reactivity/Atom";

import * as LocalDatabase from "@/data/local-database";
import * as SyncEngine from "@/data/sync-engine";
import * as SyncStore from "@/data/sync-store";

export const appRuntime = Atom.runtime(
    Layer.mergeAll(
        LocalDatabase.layer,
        SyncEngine.layer.pipe(Layer.provide(SyncStore.layer)),
        Logger.layer([Logger.withLeveledConsole(Logger.formatSimple)])
    )
).pipe(Atom.keepAlive);
