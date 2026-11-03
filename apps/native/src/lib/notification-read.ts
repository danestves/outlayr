import { ReadResult } from "@outlayr/backend/confect/notificationRead.spec";
import type { NotificationRead } from "@outlayr/backend/confect/notificationRead.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { firstLocale } from "@/i18n/device-language";

import { aiConsentArgs, cloudAction, isCloudAuthenticated } from "./convex";
import type { PendingWrite } from "./pending-writes-core";

export type NotificationReads = ReadonlyMap<string, NotificationRead>;

export type NotificationReader = (db: Database, jobs: readonly PendingWrite[]) => Effect.Effect<NotificationReads>;

// The drain holds a notification tap until it lands, so a slow read falls back to the on-device parse.
const READ_TIMEOUT_MS = 8000;
const READ_CONCURRENCY = 4;

const decodeReadResult = Schema.decodeUnknownOption(ReadResult);

const readOne = (text: string, language: string | undefined) =>
    cloudAction(api.notificationRead.read, { language, text, ...aiConsentArgs() }).pipe(
        Effect.map((reply) => Option.getOrNull(Option.flatMapNullishOr(decodeReadResult(reply), ({ read }) => read))),
        Effect.timeout(READ_TIMEOUT_MS),
        Effect.catchCause(() => Effect.succeed(null))
    );

export const readNotifications: NotificationReader = Effect.fn("NotificationRead.readNotifications")(
    function* readNotifications(db, jobs) {
        const reads = new Map<string, NotificationRead>();
        const pushes = jobs.filter((job) => job.text?.trim());
        if (pushes.length === 0 || !isCloudAuthenticated()) {
            return reads;
        }
        if (!(yield* readRemoteEnrichment(db).pipe(Effect.orElseSucceed(() => false)))) {
            return reads;
        }
        const language = firstLocale()?.languageTag?.trim() || undefined;
        const answers = yield* Effect.all(
            pushes.map((job) => readOne(job.text ?? "", language).pipe(Effect.map((read) => ({ id: job.id, read })))),
            { concurrency: READ_CONCURRENCY }
        );
        for (const { id, read } of answers) {
            if (read !== null) {
                reads.set(id, read);
            }
        }
        return reads;
    }
);
