import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const files = vi.hoisted(() => new Map<string, string>());

vi.mock("./queue-directory", () => ({ queueDirectory: () => ({}) }));
vi.mock("expo-file-system", () => {
    class File {
        private readonly name: string;
        constructor(_directory: unknown, name: string) {
            this.name = name;
        }
        get exists() {
            return files.has(this.name);
        }
        textSync() {
            return files.get(this.name) ?? "";
        }
        writeSync(text: string, options?: { append?: boolean }) {
            files.set(this.name, options?.append ? `${files.get(this.name) ?? ""}${text}` : text);
        }
    }
    return { File };
});

import { readPulledInbox } from "./pulled-inbox";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
    files.clear();
});

describe("readPulledInbox", () => {
    it("returns ids pulled in the last 30 days and drops the stale lines", () => {
        const fresh = JSON.stringify({ at: NOW - DAY, id: "fresh" });
        const stale = JSON.stringify({ at: NOW - 31 * DAY, id: "stale" });
        files.set("pulled-inbox.jsonl", [stale, fresh, "not json", ""].join("\n"));

        expect(readPulledInbox(NOW)).toStrictEqual(new Set(["fresh"]));
        expect(files.get("pulled-inbox.jsonl")).toBe(`${fresh}\n`);
    });
});
