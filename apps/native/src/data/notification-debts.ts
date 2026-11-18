import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";

import { useMeta } from "./app-meta";
import { Meta } from "./app-meta-core";

export const useNotificationDebts = (db: Database) => useMeta(db, "notificationDebts");

export const findNotificationDebt = (db: Database, id: string) =>
    Meta.getSync(db, "notificationDebts").find((debt) => debt.id === id) ?? null;

export const dropNotificationDebt = Effect.fn("NotificationDebts.drop")(function* dropNotificationDebt(
    db: Database,
    id: string | undefined
) {
    if (id === undefined) {
        return;
    }
    const kept = yield* Meta.get(db, "notificationDebts");
    yield* Meta.set(
        db,
        "notificationDebts",
        kept.filter((debt) => debt.id !== id)
    );
});
