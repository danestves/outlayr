import { assert, boolean, constant, integer, option, pre, property, record } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { incomingWinsLocally } from "./sync-engine-core";

interface Version {
    deletedAt: number | null;
    restoredAt: number | null;
    updatedAt: number;
}

const updatedAt = integer({ max: 1_000_000, min: 0 });
const stamp = option(integer({ max: 1_000_000, min: 0 }), { nil: null });
const plainVersion = record({ deletedAt: stamp, restoredAt: constant(null), updatedAt });

const applyLocally = (local: Version, incoming: Version): Version =>
    incomingWinsLocally(incoming, local, false) ? incoming : local;

describe("incomingWinsLocally", () => {
    it("reaches the same row whichever of two concurrent edits arrives first", () => {
        assert(
            property(plainVersion, plainVersion, plainVersion, (local, lhs, rhs) => {
                const leftFirst = applyLocally(applyLocally(local, lhs), rhs);
                const rightFirst = applyLocally(applyLocally(local, rhs), lhs);

                expect(leftFirst).toStrictEqual(rightFirst);
            })
        );
    });

    it("lets exactly one of two different versions win", () => {
        assert(
            property(plainVersion, plainVersion, (lhs, rhs) => {
                pre(lhs.updatedAt !== rhs.updatedAt || lhs.deletedAt !== rhs.deletedAt);

                expect(incomingWinsLocally(lhs, rhs, false)).not.toBe(incomingWinsLocally(rhs, lhs, false));
            })
        );
    });

    it("restores past a tombstone the restore undoes", () => {
        assert(
            property(integer({ max: 1_000_000, min: 0 }), integer({ max: 1_000_000, min: 1 }), (deletedAt, gap) => {
                const local = { deletedAt, restoredAt: null, updatedAt: 1_000_000 };
                const incoming = { deletedAt: null, restoredAt: deletedAt + gap, updatedAt: 0 };

                expect(incomingWinsLocally(incoming, local, false)).toBe(true);
            })
        );
    });

    it("keeps a queued local meta edit instead of overwriting it", () => {
        assert(
            property(updatedAt, boolean(), (incomingUpdatedAt, pending) => {
                const local = { deletedAt: null, restoredAt: null, updatedAt: null };
                const incoming = { deletedAt: null, restoredAt: null, updatedAt: incomingUpdatedAt };

                expect(incomingWinsLocally(incoming, local, pending)).toBe(!pending);
            })
        );
    });

    it("takes a newer live edit even while this device still owes the row a push", () => {
        assert(
            property(updatedAt, integer({ max: 1_000_000, min: 1 }), (base, gap) => {
                const local = { deletedAt: null, restoredAt: null, updatedAt: base };
                const incoming = { deletedAt: null, restoredAt: null, updatedAt: base + gap };

                expect(incomingWinsLocally(incoming, local, true)).toBe(true);
            })
        );
    });
});
