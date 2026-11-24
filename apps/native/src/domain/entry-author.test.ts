import { describe, expect, it } from "vite-plus/test";

import { entryAuthor } from "./entry-author";

const OWNER = "owner-1";
const ME = "me-2";
const OTHER = "other-3";

const NAMES = new Map<string, string | null>([
    [OWNER, "Ana"],
    [ME, "Beto"],
    [OTHER, "Carla"],
]);

describe("entryAuthor", () => {
    it("names the member who logged someone else's entry", () => {
        expect(entryAuthor(OTHER, OWNER, ME, NAMES)).toBe("Carla");
    });

    it("says nothing on the viewer's own entry", () => {
        expect(entryAuthor(ME, OWNER, ME, NAMES)).toBeNull();
    });

    it("falls back to the owner when the row predates createdBy", () => {
        expect(entryAuthor(null, OWNER, ME, NAMES)).toBe("Ana");
    });

    it("says nothing for an id the member list does not know", () => {
        expect(entryAuthor("gone-4", OWNER, ME, NAMES)).toBeNull();
    });

    it("says nothing without a member list", () => {
        expect(entryAuthor(OTHER, OWNER, ME, new Map())).toBeNull();
    });
});
