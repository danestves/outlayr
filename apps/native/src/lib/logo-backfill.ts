import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import { File } from "expo-file-system";

import type { LogoBackfillDeps } from "@/data/logo-backfill-core";
import { attachMissingLogos } from "@/data/logo-backfill-core";
import { readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { firstLocale } from "@/i18n/device-language";
import { persistLogo } from "@/lib/persist-logo";
import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { readBoolSettingCommand, readRemoteEnrichmentCommand, runSettingsCommand } from "@/state/settings-commands";

import type { CloudError } from "./cloud-error";
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

export function backfillLogos(db: Database): Promise<number> {
    if (db === halted) {
        return Promise.resolve(0);
    }
    lastDb = db;
    if (inFlight === null) {
        const generation = cancelGeneration;
        inFlight = runBackfill(db, () => cancelGeneration !== generation).finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
}

/** Called before a device erase: a pass awaiting the model or an image would write into an emptied directory. */
export async function cancelLogoBackfill(): Promise<void> {
    cancelGeneration += 1;
    halted = lastDb;
    await inFlight?.catch(() => 0);
}

/** One pass at a time: a foreground event during the launch pass would otherwise duplicate model calls and logos. */
let inFlight: Promise<number> | null = null;
let cancelGeneration = 0;
/** A pass queued behind the Wallet drain can arrive after a cancel and must not start on a database being erased. */
let lastDb: Database | null = null;
let halted: Database | null = null;

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
                : async (args) => {
                      // Read at send time: the pass outlives the settings screen and must not send after consent went.
                      const [remoteEnrichment, groundedLookup] = await Promise.all([
                          runSettingsCommand(readRemoteEnrichmentCommand, db),
                          runSettingsCommand(readBoolSettingCommand, { db, key: "groundedLookup" }),
                      ]);
                      if (!remoteEnrichment || cancelled()) {
                          return null;
                      }
                      const result = unwrapAtomCommand(
                          await runAtomCommand(
                              appAtomRegistry,
                              enrichCommand,
                              transport({
                                  background: true,
                                  categoryTree: [],
                                  currency: args.currency ?? undefined,
                                  groundedLookup,
                                  income: args.income,
                                  locale,
                                  name: args.name,
                                  regionCode,
                              }),
                              SILENT
                          )
                      );
                      return { groundedLookup, result };
                  },
        fetchImage: (request) => fetchMerchantImage(request).pipe(Effect.provideService(HttpClient.HttpClient, http)),
        persist: persistLogo,
    };
    return yield* attachMissingLogos(db, deps);
});

const enrichCommand = createCommand({
    execute: (call: Effect.Effect<RemoteEnrichmentResult, CloudError>) => call,
    label: "ledger:logo-backfill-enrich",
});

const backfillCommand = createCommand({
    execute: (input: { cancelled: () => boolean; db: Database }) =>
        backfillPass(input.db, input.cancelled).pipe(Effect.provide(outboundHttp)),
    label: "ledger:logo-backfill",
});

async function runBackfill(db: Database, cancelled: () => boolean): Promise<number> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, backfillCommand, { cancelled, db }, SILENT));
}
