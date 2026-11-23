import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File } from "expo-file-system";

import { queueDirectory } from "./queue-directory";

const PULLED_FILE = "pulled-inbox.jsonl";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const Pulled = Schema.Struct({ at: Schema.Finite, id: Schema.String });
type Pulled = typeof Pulled.Type;

const decodePulled = Schema.decodeUnknownOption(Pulled);

function parsePulled(line: string): Pulled | null {
    try {
        return Option.getOrNull(decodePulled(JSON.parse(line)));
    } catch {
        return null;
    }
}

export function recordPulledInbox(ids: readonly string[]): void {
    try {
        const directory = queueDirectory();
        if (!directory || ids.length === 0) {
            return;
        }
        const file = new File(directory, PULLED_FILE);
        const at = Date.now();
        file.writeSync(ids.map((id) => `${JSON.stringify({ at, id })}\n`).join(""), { append: true });
    } catch (error) {
        console.warn("[outlayr] pulled inbox not persisted", error);
    }
}

export function readPulledInbox(now: number): Set<string> {
    try {
        const directory = queueDirectory();
        if (!directory) {
            return new Set();
        }
        const file = new File(directory, PULLED_FILE);
        if (!file.exists) {
            return new Set();
        }
        const lines = file
            .textSync()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        const kept: Pulled[] = [];
        for (const line of lines) {
            const pulled = parsePulled(line);
            if (pulled && now - pulled.at <= RETENTION_MS) {
                kept.push(pulled);
            }
        }
        if (kept.length !== lines.length) {
            file.writeSync(kept.map((pulled) => `${JSON.stringify(pulled)}\n`).join(""));
        }
        return new Set(kept.map((pulled) => pulled.id));
    } catch (error) {
        console.warn("[outlayr] pulled inbox unreadable", error);
        return new Set();
    }
}
