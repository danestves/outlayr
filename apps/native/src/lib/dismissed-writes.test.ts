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

import { persistDismissal, readDismissals } from "./dismissed-writes";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
    files.clear();
});

describe("readDismissals", () => {
    it("keeps recent ids and drops stale or malformed lines", () => {
        const stale = JSON.stringify({ at: NOW - 91 * DAY, id: "stale" });
        files.set(
            "dismissed.jsonl",
            [
                JSON.stringify({ at: NOW - DAY, id: "fresh" }),
                stale,
                "not json",
                JSON.stringify({ at: NOW - DAY }),
                "",
            ].join("\n")
        );

        expect(readDismissals(NOW, new Set())).toStrictEqual(["fresh"]);
        expect(files.get("dismissed.jsonl")).toBe(`${JSON.stringify({ at: NOW - DAY, id: "fresh" })}\n`);
    });

    it("keeps an expired dismissal while a held file still names it", () => {
        const stale = JSON.stringify({ at: NOW - 91 * DAY, id: "parked" });
        files.set("dismissed.jsonl", `${stale}\n`);

        expect(readDismissals(NOW, new Set(["parked"]))).toStrictEqual(["parked"]);
        expect(files.get("dismissed.jsonl")).toBe(`${stale}\n`);
    });

    it("returns nothing when no dismissal was ever written", () => {
        expect(readDismissals(NOW, new Set())).toStrictEqual([]);
    });
});

describe("persistDismissal", () => {
    it("appends an id that the next drain reads back", () => {
        persistDismissal("wallet-1");
        persistDismissal("wallet-2");

        expect(readDismissals(Date.now(), new Set())).toStrictEqual(["wallet-1", "wallet-2"]);
    });
});
