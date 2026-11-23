import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File } from "expo-file-system";

import { queueDirectory } from "./queue-directory";

const DISMISSED_FILE = "dismissed.jsonl";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const Dismissal = Schema.Struct({ at: Schema.Finite, id: Schema.String });
type Dismissal = typeof Dismissal.Type;

const decodeDismissal = Schema.decodeUnknownOption(Dismissal);

function parseDismissal(line: string): Dismissal | null {
    try {
        return Option.getOrNull(decodeDismissal(JSON.parse(line)));
    } catch {
        return null;
    }
}

export function persistDismissal(id: string): void {
    try {
        const directory = queueDirectory();
        if (!directory) {
            return;
        }
        const file = new File(directory, DISMISSED_FILE);
        file.writeSync(`${JSON.stringify({ at: Date.now(), id })}\n`, { append: true });
    } catch (error) {
        console.warn("[outlayr] dismissal not persisted", error);
    }
}

export function readDismissals(now: number): string[] {
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
            if (dismissal && now - dismissal.at <= RETENTION_MS) {
                kept.push(dismissal);
            }
        }
        if (kept.length !== lines.length) {
            file.writeSync(kept.map((dismissal) => `${JSON.stringify(dismissal)}\n`).join(""));
        }
        return kept.map((dismissal) => dismissal.id);
    } catch (error) {
        console.warn("[outlayr] dismissals unreadable", error);
        return [];
    }
}
