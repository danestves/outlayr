import { describe, expect, it } from "vite-plus/test";

import { incomingWins } from "./syncTables";

const live = (updatedAt: number, restoredAt: number | null = null) => ({
    deletedAt: null,
    deviceId: "device-a",
    restoredAt,
    updatedAt,
});
const deleted = (deletedAt: number, restoredAt: number | null = null) => ({
    deletedAt,
    deviceId: "device-a",
    restoredAt,
    updatedAt: deletedAt,
});

// The same cases run against `incomingWinsLocally` in apps/native's sync-engine-core.test.ts; the two must agree.
describe("incomingWins across a restore", () => {
    it.each([
        ["a restore beats the older tombstone it lifted", live(20, 20), deleted(10), true],
        ["the lifted tombstone does not undo the restore", deleted(10), live(20, 20), false],
        ["an offline edit after a delete still loses", live(12), deleted(10), false],
        ["an edit that raced the delete loses to the restore", live(30), live(20, 20), false],
        ["a delete after the restore wins", deleted(25, 20), live(20, 20), true],
        ["a delete after the restore wins with its clock behind", deleted(15, 20), live(20, 20), true],
        ["a delete that never saw the restore wins only if later", deleted(22), live(20, 20), true],
        ["a delete that never saw the restore loses if earlier", deleted(18), live(20, 20), false],
        ["a restore stamped at the delete's instant loses the tie", live(10, 10), deleted(10), false],
        ["an edit after the restore is plain R2", live(30, 20), live(20, 20), true],
    ])("%s", (_name, incoming, existing, wins) => {
        expect(incomingWins(incoming, existing)).toBe(wins);
    });
});
