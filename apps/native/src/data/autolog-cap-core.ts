import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { AutologAccess, monthUsage, parseAutologUsage, withAutologEntry } from "@/domain/autolog-cap";
import type { AutologUsage } from "@/domain/autolog-cap";
import { parseLegacyQueue } from "@/lib/pending-writes-core";
import type { PendingWrite } from "@/lib/pending-writes-core";
import { posthog } from "@/lib/posthog";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

const decodeAccess = Schema.decodeUnknownOption(AutologAccess);

export const readAutologAccess = Effect.fn("Autolog.readAccess")(function* readAutologAccess(db: Database) {
    const raw = yield* getMeta(db, META_KEYS.autologAccess);
    return Option.getOrElse(decodeAccess(raw), (): AutologAccess => "open");
});

export const writeAutologAccess = (db: Database, access: AutologAccess) => setMeta(db, META_KEYS.autologAccess, access);

export const readAutologUsage = Effect.fn("Autolog.readUsage")(function* readAutologUsage(db: Database) {
    return parseAutologUsage(yield* getMeta(db, META_KEYS.autologUsage));
});

export const readAutologWaiting = Effect.fn("Autolog.readWaiting")(function* readAutologWaiting(db: Database) {
    const raw = yield* getMeta(db, META_KEYS.autologWaiting);
    return raw ? parseLegacyQueue(raw) : [];
});

export const writeAutologWaiting = (db: Database, writes: readonly PendingWrite[]) =>
    setMeta(db, META_KEYS.autologWaiting, JSON.stringify(writes));

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
    yield* setMeta(db, META_KEYS.autologUsage, JSON.stringify(next));
    return next;
});

export const countAutologEntry = Effect.fn("Autolog.count")(function* countAutologEntry(
    db: Database,
    usage: AutologUsage,
    at: number
) {
    const next = withAutologEntry(usage, at, "applied");
    yield* setMeta(db, META_KEYS.autologUsage, JSON.stringify(next));
    return next;
});
