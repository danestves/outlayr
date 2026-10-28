import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const existing = vi.hoisted(() => new Set<string>());
const writtenAt = vi.hoisted(() => new Map<string, number>());

vi.mock("expo-file-system", () => {
    class Directory {
        get exists() {
            return true;
        }
        create() {}
    }
    class File {
        private readonly name: string;
        constructor(_parent: unknown, name: string) {
            this.name = name;
        }
        get exists() {
            return existing.has(this.name);
        }
        get uri() {
            return `file:///cache/merchant-logos/${this.name}`;
        }
        get modificationTime() {
            return writtenAt.get(this.name);
        }
        delete() {
            existing.delete(this.name);
        }
        create() {
            existing.add(this.name);
        }
        writeSync() {}
    }
    return { Directory, File, Paths: { cache: "/cache" } };
});

import { cachedLogoUri, logoCacheKey, readCachedLogo, writeCachedLogo } from "./logo-cache";

describe("logoCacheKey", () => {
    it("folds case, diacritics and punctuation to the same key", () => {
        expect(logoCacheKey("NETFLIX", "netflix.com")).toBe(logoCacheKey("netflix", "netflix.com"));
    });

    it("differs for a different domain", () => {
        expect(logoCacheKey("Rio", "riosupermercado.com")).not.toBe(logoCacheKey("Rio", "rio.com"));
    });
});

describe("cachedLogoUri", () => {
    beforeEach(() => {
        existing.clear();
    });

    it("returns null for a merchant the cache has never seen", () => {
        expect(cachedLogoUri("netflix")).toBeNull();
    });

    it("returns the cached file's uri for a hit", () => {
        existing.add("netflix");
        expect(cachedLogoUri("netflix")).toBe("file:///cache/merchant-logos/netflix");
    });

    it("returns null for a remembered miss, even though the marker file exists", () => {
        existing.add("netflix.miss");
        expect(cachedLogoUri("netflix")).toBeNull();
    });
});

describe("a miss expires", () => {
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    beforeEach(() => {
        existing.clear();
        writtenAt.clear();
    });

    it("is still a miss inside the week", async () => {
        existing.add("zinli.miss");
        writtenAt.set("zinli.miss", 1000);
        await expect(Effect.runPromise(readCachedLogo("zinli", 1000 + WEEK - 1))).resolves.toStrictEqual({
            kind: "miss",
        });
        expect(cachedLogoUri("zinli", 1000 + WEEK - 1)).toBeNull();
    });

    it("is forgotten, and its marker removed, once the week is up", async () => {
        existing.add("zinli.miss");
        writtenAt.set("zinli.miss", 1000);
        await expect(Effect.runPromise(readCachedLogo("zinli", 1000 + WEEK + 1))).resolves.toStrictEqual({
            kind: "unknown",
        });
        expect(existing.has("zinli.miss")).toBe(false);
    });

    it("keeps a marker with no readable time, rather than guessing", async () => {
        existing.add("zinli.miss");
        await expect(Effect.runPromise(readCachedLogo("zinli", Number.MAX_SAFE_INTEGER))).resolves.toStrictEqual({
            kind: "miss",
        });
    });
});

describe("writeCachedLogo", () => {
    beforeEach(() => {
        existing.clear();
        writtenAt.clear();
    });

    // A refreshed ask found the logo the earlier miss said was not there; the
    // marker is read first, so it has to go or the file is never served.
    it("removes a standing miss marker when a logo is written for the key", () => {
        existing.add("zinli.miss");
        writtenAt.set("zinli.miss", 1000);

        writeCachedLogo("zinli", new Uint8Array([1]));

        expect(existing.has("zinli.miss")).toBe(false);
        expect(existing.has("zinli")).toBe(true);
    });
});
