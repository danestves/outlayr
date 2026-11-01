import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { ImportEntry } from "@/data/transfer-core";

import { attachImportLogos } from "./import-logo-attach";

vi.mock<Partial<typeof import("@/domain/import-review-identity")>>(import("@/domain/import-review-identity"), () => ({
    reviewEntryIdentity: (note: string) => ({
        displayName: note,
        domain: note.toLowerCase().startsWith("spotify") ? "spotify.com" : null,
    }),
}));

vi.mock("@/lib/logo-cache", () => ({
    logoCacheKey: (name: string, domain: string | null) => `${name}|${domain ?? ""}`.toLowerCase(),
    readCachedLogo: vi.fn((key: string) =>
        Effect.succeed(
            key === "spotify.com|spotify.com" ? { bytes: new Uint8Array([7]), kind: "logo" } : { kind: "unknown" }
        )
    ),
}));

const mockPersist = vi.fn(async (_bytes: Uint8Array) => "file:///documents/logo-1.png");
vi.mock("@/lib/photo-storage", () => ({
    persistLogoBytes: (bytes: Uint8Array) => Effect.tryPromise(() => mockPersist(bytes)),
}));

vi.mock<Partial<typeof import("@/theme/glow")>>(import("@/theme/glow"), () => ({
    glowFromImage: vi.fn(() => Effect.succeed(["#1DB954"])),
}));

function entry(note: string): ImportEntry {
    return {
        amount: 10,
        categoryId: "cat-1",
        currency: null,
        date: new Date(2026, 6, 28),
        income: false,
        note,
        row: 1,
    };
}

beforeEach(() => {
    mockPersist.mockClear();
});

describe("attachImportLogos", () => {
    it("attaches a persisted logo copy and tint to every row of a cached merchant", async () => {
        const result = await Effect.runPromise(
            attachImportLogos([entry("Spotify"), entry("SPOTIFY 2"), entry("Corner Bakery")])
        );

        expect(result[0]?.imageUri).toBe("file:///documents/logo-1.png");
        expect(result[0]?.imageColor).toBe("#1DB954");
        expect(result[1]?.imageUri).toBe("file:///documents/logo-1.png");
        expect(result[2]?.imageUri).toBeUndefined();
        expect(mockPersist).toHaveBeenCalledTimes(2);
    });

    it("keeps the row as imported when its logo cannot be stored, and carries on with the next", async () => {
        mockPersist.mockRejectedValueOnce(new Error("disk full"));

        const result = await Effect.runPromise(attachImportLogos([entry("Spotify"), entry("SPOTIFY 2")]));

        expect(result[0]?.imageUri).toBeUndefined();
        expect(result[1]?.imageUri).toBe("file:///documents/logo-1.png");
    });
});
