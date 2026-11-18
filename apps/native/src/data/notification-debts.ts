import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";

import { useMeta } from "./app-meta";
import { AppMetaError, Meta } from "./app-meta-core";

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
    yield* transaction(
        db,
        Effect.gen(function* drop() {
            const kept = yield* Meta.get(db, "notificationDebts");
            yield* Meta.set(
                db,
                "notificationDebts",
                kept.filter((debt) => debt.id !== id)
            );
        }),
        (cause) => new AppMetaError({ cause, key: "notificationDebts", operation: "set" })
    );
});
