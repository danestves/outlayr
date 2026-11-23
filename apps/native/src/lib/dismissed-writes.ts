import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File } from "expo-file-system";

import { queueDirectory } from "./queue-directory";

const DISMISSED_FILE = "dismissed.jsonl";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const Dismissal = Schema.Struct({
    at: Schema.Finite,
    date: Schema.optional(Schema.Finite),
    id: Schema.String,
    key: Schema.optional(Schema.String),
});
export type Dismissal = typeof Dismissal.Type;

const decodeDismissal = Schema.decodeUnknownOption(Dismissal);

function parseDismissal(line: string): Dismissal | null {
    try {
        return Option.getOrNull(decodeDismissal(JSON.parse(line)));
    } catch {
        return null;
    }
}

// The purchase a filed write settled is recorded with its id: a relaunch must still know which settlement to skip.
export function persistDismissal(id: string, purchase?: { date: number; key: string }): void {
    try {
        const directory = queueDirectory();
        if (!directory) {
            return;
        }
        const at = Date.now();
        const record = purchase === undefined ? { at, id } : { at, date: purchase.date, id, key: purchase.key };
        const file = new File(directory, DISMISSED_FILE);
        file.writeSync(`${JSON.stringify(record)}\n`, { append: true });
    } catch (error) {
        console.warn("[outlayr] dismissal not persisted", error);
    }
}

// `retain` holds ids a held file still references: dropping their dismissal early would file them days later.
// A null `retain` means the held scan failed, so nothing can be pruned and the file is left alone.
export function readDismissals(now: number, retain: ReadonlySet<string> | null): Dismissal[] {
    try {
        const directory = queueDirectory();
        if (!directory) {
            return [];
        }
        const file = new File(directory, DISMISSED_FILE);
        if (!file.exists) {
            return [];
        }
        const lines = file
            .textSync()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const kept: Dismissal[] = [];
        for (const line of lines) {
            const dismissal = parseDismissal(line);
            if (dismissal && (retain === null || now - dismissal.at <= RETENTION_MS || retain.has(dismissal.id))) {
                kept.push(dismissal);
            }
        }
        if (retain !== null && kept.length !== lines.length) {
            file.writeSync(kept.map((dismissal) => `${JSON.stringify(dismissal)}\n`).join(""));
        }
        return kept;
    } catch (error) {
        console.warn("[outlayr] dismissals unreadable", error);
        return [];
    }
}
