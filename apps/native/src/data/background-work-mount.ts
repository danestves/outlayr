import { useAtomMount } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import * as Atom from "effect/reactivity/Atom";

import type { Database } from "@/db/client";
import { armChosenReminder } from "@/lib/chosen-reminder";
import { photoTransport } from "@/lib/cloud-photos";
import { DailyReminderSteps } from "@/lib/daily-reminder-sync";
import { DueReminderPasses } from "@/lib/due-reminder-sync";
import { EnrichmentSync } from "@/lib/enrichment-sync";
import { syncInstallmentReminders } from "@/lib/installment-reminder-sync";
import { replateLogos } from "@/lib/logo-replate";
import { photoFiles } from "@/lib/photo-storage";
import { reconcileDailyReminder } from "@/lib/reminder-sync";
import { appRuntime } from "@/lib/runtime";
import { indexSpotlight } from "@/lib/spotlight";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";
import { SystemSurfaces } from "@/lib/system-sync";
import { publishWidgets } from "@/widgets/publish";

import { BackgroundProgram } from "./background-program";
import { reconcilePhotos } from "./photo-store-core";
import { PhotoPasses, PhotoSync } from "./photo-sync";
import { runPhotoSync } from "./photo-sync-core";
import { deviceHasProfiles } from "./profile-registry";

const backgroundSurfaces = Layer.mergeAll(
    Layer.succeed(DailyReminderSteps, DailyReminderSteps.of({ arm: armChosenReminder, sync: reconcileDailyReminder })),
    Layer.succeed(
        DueReminderPasses,
        DueReminderPasses.of({ installment: syncInstallmentReminders, subscription: syncSubscriptionReminders })
    ),
    Layer.succeed(SystemSurfaces, SystemSurfaces.of({ indexSpotlight: (db) => indexSpotlight(db), publishWidgets }))
);

const photoPasses = Layer.effect(
    PhotoPasses,
    Effect.gen(function* photoPassesMake() {
        const http = yield* HttpClient.HttpClient;
        return PhotoPasses.of({
            reconcile: (db, nowMs) => reconcilePhotos(db, photoFiles, nowMs, deviceHasProfiles()),
            replateLogos,
            sync: (db) =>
                photoTransport().pipe(
                    Effect.flatMap((transport) => runPhotoSync(db, photoFiles, transport)),
                    Effect.provideService(HttpClient.HttpClient, http)
                ),
        });
    })
);

export const backgroundProgramAtom = Atom.family((db: Database) =>
    appRuntime
        .atom(
            BackgroundProgram.pipe(
                Effect.flatMap((program) => program.run(db)),
                Effect.provide(backgroundSurfaces)
            )
        )
        .pipe(Atom.withLabel("background-work:program"))
);

export const enrichmentSyncAtom = Atom.family((db: Database) =>
    appRuntime
        .atom(EnrichmentSync.pipe(Effect.flatMap((enrichment) => enrichment.run(db))))
        .pipe(Atom.withLabel("background-work:enrichment"))
);

export const photoReconcileAtom = Atom.family((db: Database) =>
    appRuntime
        .atom(
            PhotoSync.pipe(
                Effect.flatMap((photos) => photos.reconcile(db)),
                Effect.provide(photoPasses)
            )
        )
        .pipe(Atom.withLabel("background-work:photo-reconcile"))
);

export const photoSyncAtom = Atom.family((db: Database) =>
    appRuntime
        .atom(
            PhotoSync.pipe(
                Effect.flatMap((photos) => photos.run(db)),
                Effect.provide(photoPasses)
            )
        )
        .pipe(Atom.withLabel("background-work:photo-sync"))
);

export function BackgroundProgramMount({ db }: { db: Database }) {
    useAtomMount(backgroundProgramAtom(db));
    useAtomMount(photoReconcileAtom(db));
    return null;
}

export function EnrichmentSyncMount({ db }: { db: Database }) {
    useAtomMount(enrichmentSyncAtom(db));
    return null;
}

export function PhotoSyncMount({ db }: { db: Database }) {
    useAtomMount(photoSyncAtom(db));
    return null;
}
