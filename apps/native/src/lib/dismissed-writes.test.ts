import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const files = vi.hoisted(() => new Map<string, string>());

vi.mock("./queue-directory", () => ({ queueDirectory: () => ({}) }));
vi.mock("expo-file-system", () => {
    class File {
        readonly name: string;
        constructor(_directory: unknown, name: string) {
            this.name = name;
        }
        get parentDirectory() {
            return {};
        }
        delete() {
            files.delete(this.name);
        }
        moveSync(destination: File) {
            files.set(destination.name, this.textSync());
            files.delete(this.name);
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

        expect(readDismissals(NOW, new Set())).toStrictEqual([{ at: NOW - DAY, id: "fresh" }]);
        expect(files.get("dismissed.jsonl")).toBe(`${JSON.stringify({ at: NOW - DAY, id: "fresh" })}\n`);
    });

    it("keeps an expired dismissal while a held file still names it", () => {
        const stale = JSON.stringify({ at: NOW - 91 * DAY, id: "parked" });
        files.set("dismissed.jsonl", `${stale}\n`);

        expect(readDismissals(NOW, new Set(["parked"]))).toStrictEqual([{ at: NOW - 91 * DAY, id: "parked" }]);
        expect(files.get("dismissed.jsonl")).toBe(`${stale}\n`);
    });

    it("keeps an expired dismissal while a held capture shares its purchase key", () => {
        const dismissal = { at: NOW - 91 * DAY, date: NOW - 95 * DAY, id: "authorization", key: "wallet:cafe:640" };
        const stale = JSON.stringify(dismissal);
        files.set("dismissed.jsonl", `${stale}\n`);

        expect(readDismissals(NOW, new Set(["wallet:cafe:640"]))).toStrictEqual([dismissal]);
        expect(files.get("dismissed.jsonl")).toBe(`${stale}\n`);
    });

    it("returns every dismissal, expired included, when the held scan failed", () => {
        const stale = { at: NOW - 91 * DAY, id: "stale" };
        const fresh = { at: NOW - DAY, id: "fresh" };
        files.set("dismissed.jsonl", `${JSON.stringify(stale)}\n${JSON.stringify(fresh)}\n`);

        expect(readDismissals(NOW, null)).toStrictEqual([stale, fresh]);
        expect(files.get("dismissed.jsonl")).toBe(`${JSON.stringify(stale)}\n${JSON.stringify(fresh)}\n`);
    });

    it("returns nothing when no dismissal was ever written", () => {
        expect(readDismissals(NOW, new Set())).toStrictEqual([]);
    });
});

describe("persistDismissal", () => {
    it("appends an id that the next drain reads back", () => {
        persistDismissal("wallet-1");
        persistDismissal("wallet-2");

        expect(readDismissals(Date.now(), new Set()).map((entry) => entry.id)).toStrictEqual(["wallet-1", "wallet-2"]);
    });

    it("keeps the purchase a dismissal names so a settlement can follow it after a relaunch", () => {
        persistDismissal("wallet-1", { date: NOW - 60_000, key: "wallet:expense:cafe:640" });

        expect(readDismissals(NOW, new Set())).toStrictEqual([
            { at: expect.any(Number), date: NOW - 60_000, id: "wallet-1", key: "wallet:expense:cafe:640" },
        ]);
    });
});
