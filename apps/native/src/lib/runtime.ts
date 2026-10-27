import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Atom from "effect/reactivity/Atom";

import * as BackgroundProgram from "@/data/background-program";
import * as LocalDatabase from "@/data/local-database";
import * as PhotoSync from "@/data/photo-sync";
import * as RecurrenceSweep from "@/data/recurrence-sweep";
import * as SyncEngine from "@/data/sync-engine";
import * as SyncStore from "@/data/sync-store";
import * as CsvImport from "@/lib/csv-import";
import * as DailyReminderSync from "@/lib/daily-reminder-sync";
import * as DueReminderSync from "@/lib/due-reminder-sync";
import * as EnrichmentSync from "@/lib/enrichment-sync";
import { outboundHttp } from "@/lib/http";
import * as RevenueCat from "@/lib/revenuecat-service";
import * as SecureStorage from "@/lib/secure-storage";
import * as SystemSync from "@/lib/system-sync";

export const appRuntime = Atom.runtime(
    Layer.mergeAll(
        LocalDatabase.layer,
        SyncEngine.layer.pipe(Layer.provide(SyncStore.layer)),
        BackgroundProgram.layer.pipe(
            Layer.provideMerge(
                Layer.mergeAll(DailyReminderSync.layer, DueReminderSync.layer, RecurrenceSweep.layer, SystemSync.layer)
            )
        ),
        EnrichmentSync.layer,
        CsvImport.layer,
        PhotoSync.layer,
        RevenueCat.layer,
        SecureStorage.layer,
        outboundHttp,
        Logger.layer([Logger.withLeveledConsole(Logger.formatSimple)])
    )
).pipe(Atom.keepAlive, Atom.withLabel("app:runtime"));
