import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { monthUsage, withAutologEntry } from "@/domain/autolog-cap";
import type { AutologAccess, AutologUsage } from "@/domain/meta-values";
import { posthog } from "@/lib/posthog";
import type { PendingWrite } from "@/lib/queue-file";

import { Meta } from "./app-meta-core";

export const readAutologAccess = (db: Database) => Meta.get(db, "autologAccess");

export const writeAutologAccess = (db: Database, access: AutologAccess) => Meta.set(db, "autologAccess", access);

export const readAutologUsage = (db: Database) => Meta.get(db, "autologUsage");

export const readAutologWaiting = (db: Database) => Meta.get(db, "autologWaiting");

export const writeAutologWaiting = (db: Database, writes: readonly PendingWrite[]) =>
    Meta.set(db, "autologWaiting", writes);

export const holdAutologWrite = Effect.fn("Autolog.hold")(function* holdAutologWrite(
    db: Database,
    usage: AutologUsage,
    write: PendingWrite,
    at: number
) {
    if (!monthUsage(usage, at).held) {
        posthog?.capture("limit_hit", { limit: "autolog" });
    }
    const next = withAutologEntry(usage, at, "held");
    const waiting = yield* readAutologWaiting(db);
    yield* writeAutologWaiting(db, waiting.some((kept) => kept.id === write.id) ? waiting : [...waiting, write]);
    yield* Meta.set(db, "autologUsage", next);
    return next;
});

export const countAutologEntry = Effect.fn("Autolog.count")(function* countAutologEntry(
    db: Database,
    usage: AutologUsage,
    at: number
) {
    const next = withAutologEntry(usage, at, "applied");
    yield* Meta.set(db, "autologUsage", next);
    return next;
});
