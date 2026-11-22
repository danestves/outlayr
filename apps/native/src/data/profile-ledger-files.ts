import * as Effect from "effect/Effect";
import { Directory, File, Paths } from "expo-file-system";
import { deleteDatabaseAsync } from "expo-sqlite";

import { databaseNameFor } from "@/domain/profiles";

const sqliteDirectory = () => new Directory(Paths.document, "SQLite");

export const profileReadyMarker = (databaseName: string) => new File(sqliteDirectory(), `${databaseName}.ready`);

const readyMarker = (id: string) => profileReadyMarker(databaseNameFor(id));

// A killed first switch leaves a half-seeded database behind, so the file alone does not mean the seed finished.
export const profileLedgerExists = (id: string) => readyMarker(id).exists;

export function markProfileLedgerReady(id: string): void {
    readyMarker(id).create({ intermediates: true, overwrite: true });
}

export const deleteProfileLedger = Effect.fn("ProfileLedger.delete")(function* deleteProfileLedger(id: string) {
    yield* Effect.try(() => {
        const marker = readyMarker(id);
        if (marker.exists) {
            marker.delete();
        }
    }).pipe(Effect.ignore);
    yield* Effect.promise(() => deleteDatabaseAsync(databaseNameFor(id)).catch(() => undefined));
});
