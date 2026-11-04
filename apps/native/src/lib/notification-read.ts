import { ReadResult } from "@outlayr/backend/confect/notificationRead.spec";
import type { NotificationRead } from "@outlayr/backend/confect/notificationRead.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { unloggedPushes } from "@/data/pending-writes-core";
import { readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { hasChargeAmount } from "@/domain/parse-notification";
import { firstLocale } from "@/i18n/device-language";

import { aiConsentArgs, cloudAction, isCloudAuthenticated } from "./convex";
import type { PendingWrite } from "./pending-writes-core";

export type NotificationReads = ReadonlyMap<string, NotificationRead>;

export type NotificationReader = (db: Database, jobs: readonly PendingWrite[]) => Effect.Effect<NotificationReads>;

// The drain holds a notification tap until it lands, so whatever has not answered by then keeps the on-device parse.
const READ_BUDGET_MS = 8000;
const READ_CONCURRENCY = 4;

const decodeReadResult = Schema.decodeUnknownOption(ReadResult);

const readOne = (text: string, language: string | undefined) =>
    cloudAction(api.notificationRead.read, { language, text, ...aiConsentArgs() }).pipe(
        Effect.map((reply) => Option.getOrNull(Option.flatMapNullishOr(decodeReadResult(reply), ({ read }) => read))),
        Effect.catchCause(() => Effect.succeed(null))
    );

export const readNotifications: NotificationReader = Effect.fn("NotificationRead.readNotifications")(
    function* readNotifications(db, jobs) {
        const reads = new Map<string, NotificationRead>();
        if (!jobs.some((job) => job.text?.trim()) || !isCloudAuthenticated()) {
            return reads;
        }
        if (!(yield* readRemoteEnrichment(db).pipe(Effect.orElseSucceed(() => false)))) {
            return reads;
        }
        // Only a push that shows an amount and is not logged yet leaves the device, so login codes, promotions and
        // repeats of a logged purchase never do.
        const priced = jobs.filter((job) => job.text && hasChargeAmount(job.text));
        const pushes = yield* unloggedPushes(db, priced).pipe(Effect.orElseSucceed((): PendingWrite[] => []));
        const language = firstLocale()?.languageTag?.trim() || undefined;
        yield* Effect.all(
            pushes.map((job) =>
                readOne(job.text ?? "", language).pipe(
                    Effect.map((read) => (read === null ? reads : reads.set(job.id, read)))
                )
            ),
            { concurrency: READ_CONCURRENCY, discard: true }
        ).pipe(Effect.timeout(READ_BUDGET_MS), Effect.ignore);
        return reads;
    }
);
