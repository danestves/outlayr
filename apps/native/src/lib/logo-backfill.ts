import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import { File } from "expo-file-system";

import type { LogoBackfillDeps } from "@/data/logo-backfill-core";
import { attachMissingLogos } from "@/data/logo-backfill-core";
import { readBoolSetting, readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { firstLocale } from "@/i18n/device-language";
import { persistLogo } from "@/lib/persist-logo";

import { enrichmentTransport } from "./convex";
import { outboundHttp } from "./http";
import { fetchMerchantImage } from "./logo-fetch";

/**
 * Names the database before the first pass queues, so a cancel during the launch drain knows which handle to
 * refuse, and lifts any halt so a restore that kept the same handle runs again.
 */
export function armLogoBackfill(db: Database): void {
    lastDb = db;
    halted = null;
}

/** One pass at a time: a foreground event during the launch pass would otherwise duplicate model calls and logos. */
let inFlight: Deferred.Deferred<number, BackfillFailure> | null = null;
let cancelGeneration = 0;
/** A pass queued behind the Wallet drain can arrive after a cancel and must not start on a database being erased. */
let lastDb: Database | null = null;
let halted: Database | null = null;

type BackfillFailure = Effect.Error<ReturnType<typeof backfillPass>>;

export const backfillLogos = Effect.fn("LogoBackfill.backfill")(function* backfillLogos(db: Database) {
    if (db === halted) {
        return 0;
    }
    lastDb = db;
    if (inFlight !== null) {
        return yield* Deferred.await(inFlight);
    }
    const generation = cancelGeneration;
    const pass = Deferred.makeUnsafe<number, BackfillFailure>();
    inFlight = pass;
    return yield* backfillPass(db, () => cancelGeneration !== generation).pipe(
        Effect.provide(outboundHttp),
        Effect.onExit((exit) =>
            Effect.suspend(() => {
                inFlight = null;
                return Deferred.done(pass, exit);
            })
        ),
        Effect.uninterruptible
    );
});

/** Called before a device erase: a pass awaiting the model or an image would write into an emptied directory. */
export const cancelLogoBackfill = Effect.fn("LogoBackfill.cancel")(function* cancelLogoBackfill() {
    cancelGeneration += 1;
    halted = lastDb;
    if (inFlight !== null) {
        yield* Deferred.await(inFlight).pipe(Effect.ignore);
    }
});

export function discardLogo(imageUri: string): void {
    try {
        new File(imageUri).delete();
    } catch {
        // A file that is already gone is the outcome wanted.
    }
}

const backfillPass = Effect.fn("LogoBackfill.backfillPass")(function* backfillPass(
    db: Database,
    cancelled: () => boolean
) {
    const http = yield* HttpClient.HttpClient;
    const remoteEnabled = yield* readRemoteEnrichment(db);
    const device = firstLocale();
    const locale = device?.languageTag?.trim() || undefined;
    const regionCode = device?.regionCode?.trim() || undefined;
    const transport = remoteEnabled ? enrichmentTransport() : null;
    const deps: LogoBackfillDeps = {
        cancelled,
        discard: discardLogo,
        enrich:
            transport === null
                ? null
                : Effect.fn("LogoBackfill.enrich")(function* enrich(args) {
                      // Read at send time: the pass outlives the settings screen and must not send after consent went.
                      const [remoteEnrichment, groundedLookup] = yield* Effect.all(
                          [readRemoteEnrichment(db), readBoolSetting(db, "groundedLookup")],
                          { concurrency: "unbounded" }
                      );
                      if (!remoteEnrichment || cancelled()) {
                          return null;
                      }
                      const result = yield* transport({
                          background: true,
                          categoryTree: [],
                          currency: args.currency ?? undefined,
                          groundedLookup,
                          income: args.income,
                          locale,
                          name: args.name,
                          regionCode,
                      });
                      return { groundedLookup, result };
                  }),
        fetchImage: (request) => fetchMerchantImage(request).pipe(Effect.provideService(HttpClient.HttpClient, http)),
        persist: persistLogo,
    };
    return yield* attachMissingLogos(db, deps);
});
