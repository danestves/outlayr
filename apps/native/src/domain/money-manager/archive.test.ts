import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vite-plus/test";

import { readMoneyManagerArchive } from "./archive";
import { buildMoneyManagerFixture } from "./fixture";

const SQLITE = new TextEncoder().encode("SQLite format 3\0");

describe("readMoneyManagerArchive", () => {
    it("reads a padded zip and rejects the other backup shapes", () => {
        const archive = readMoneyManagerArchive(buildMoneyManagerFixture());
        expect(archive.ok).toBe(true);
        if (archive.ok) {
            expect(archive.version).toBe(1);
            expect([...archive.database.subarray(0, SQLITE.length)]).toStrictEqual([...SQLITE]);
        }

        expect(readMoneyManagerArchive(SQLITE)).toStrictEqual({ error: { kind: "realbyte" }, ok: false });
        expect(readMoneyManagerArchive(new Uint8Array([1, 2, 3, 4]))).toStrictEqual({
            error: { kind: "notBackup" },
            ok: false,
        });
        expect(readMoneyManagerArchive(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toStrictEqual({
            error: { kind: "damaged" },
            ok: false,
        });
        expect(readMoneyManagerArchive(buildMoneyManagerFixture({ version: 2 }))).toStrictEqual({
            error: { kind: "newer", version: 2 },
            ok: false,
        });
        expect(readMoneyManagerArchive(zipSync({ readme: strToU8("no database") }))).toStrictEqual({
            error: { kind: "notBackup" },
            ok: false,
        });

        const fixture = buildMoneyManagerFixture();
        expect(readMoneyManagerArchive(fixture.subarray(0, Math.floor(fixture.length / 2)))).toStrictEqual({
            error: { kind: "damaged" },
            ok: false,
        });
    });
});
