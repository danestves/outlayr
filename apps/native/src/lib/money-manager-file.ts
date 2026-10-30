import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";
import { deserializeDatabaseSync } from "expo-sqlite";

import { readMoneyManagerArchive } from "@/domain/money-manager/archive";
import { readMoneyManagerSnapshot } from "@/domain/money-manager/snapshot";
import type { MmArchiveError, MmSnapshot } from "@/domain/money-manager/types";
import { duringHandoff } from "@/lib/app-handoff";

export class MoneyManagerFileError extends Schema.TaggedError<MoneyManagerFileError>()("MoneyManagerFileError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["pick", "read"]),
}) {
    override get message(): string {
        return `Money Manager backup ${this.operation} failed`;
    }
}

export interface BackupSource {
    name: string;
    uri: string;
}

export type BackupReading = { ok: true; snapshot: MmSnapshot } | { ok: false; error: MmArchiveError };

/** Any type: no platform knows `.mmbackup`, so the contents decide (`readMoneyManagerArchive`). */
export const pickBackupFile = Effect.fn("MoneyManagerFile.pick")(function* pickBackupFile() {
    const result = yield* duringHandoff(
        Effect.tryPromise({
            catch: (cause) => new MoneyManagerFileError({ cause, operation: "pick" }),
            try: () => getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: "*/*" }),
        })
    );
    const asset = result.canceled ? null : result.assets[0];
    return asset == null ? null : ({ name: asset.name, uri: asset.uri } satisfies BackupSource);
});

export const readBackupFile = Effect.fn("MoneyManagerFile.read")(function* readBackupFile(source: BackupSource) {
    const bytes = yield* Effect.tryPromise({
        catch: (cause) => new MoneyManagerFileError({ cause, operation: "read" }),
        try: () => new File(source.uri).bytes(),
    });
    const archive = readMoneyManagerArchive(bytes);
    if (!archive.ok) {
        return { error: archive.error, ok: false } satisfies BackupReading;
    }
    return yield* Effect.sync((): BackupReading => {
        let database: ReturnType<typeof deserializeDatabaseSync> | null = null;
        try {
            database = deserializeDatabaseSync(archive.database);
            const opened = database;
            return {
                ok: true,
                snapshot: readMoneyManagerSnapshot((sql) => opened.getAllSync<object>(sql), archive.version),
            };
        } catch {
            return { error: { kind: "damaged" }, ok: false };
        } finally {
            database?.closeSync();
        }
    });
});
