import { describe, expect, it } from "vite-plus/test";

import type { PulledPage, PulledRow } from "./ledger-sync";
import { activeProfileOf, profilesOf } from "./profile-registry";
import { pulled } from "./test-convex";

const profile = (id: string, sortOrder: number, more: Partial<PulledRow> = {}) =>
    pulled("profiles", id, sortOrder + 1, {
        fields: {
            customColor: "#B56858",
            dateCreated: 1,
            emoji: null,
            icon: "Home01",
            imageColor: null,
            imageKey: null,
            name: id,
            sortOrder,
        },
        ...more,
    });

const page = (rows: readonly PulledRow[]): PulledPage => ({ cursor: 0, hasMore: false, rows });

describe("profile registry", () => {
    it("lists live profiles in sort order and drops a deleted one", () => {
        const rows = [profile("work", 1), profile("family", 0), profile("gone", 2, { deletedAt: 9 })];

        expect(profilesOf(page(rows)).map((row) => row.id)).toStrictEqual(["family", "work"]);
    });

    it("falls back to Personal when the cookie names a profile that is gone", () => {
        const live = page([profile("work", 1)]);

        expect(activeProfileOf(profilesOf(live), "work")?.id).toBe("work");
        expect(activeProfileOf(profilesOf(live), "gone")).toBeNull();
        expect(activeProfileOf(profilesOf(live), null)).toBeNull();
    });
});
