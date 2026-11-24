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
        expect(entryAuthor(OTHER, false, OWNER, ME, NAMES)).toBe("Carla");
    });

    it("says nothing on the viewer's own entry", () => {
        expect(entryAuthor(ME, false, OWNER, ME, NAMES)).toBeNull();
    });

    it("falls back to the owner when the row predates createdBy", () => {
        expect(entryAuthor(null, false, OWNER, ME, NAMES)).toBe("Ana");
    });

    it("says nothing on an unsent row with no createdBy, since the owner did not necessarily log it", () => {
        expect(entryAuthor(null, true, OWNER, ME, NAMES)).toBeNull();
    });

    it("says nothing for an id the member list does not know", () => {
        expect(entryAuthor("gone-4", false, OWNER, ME, NAMES)).toBeNull();
    });

    it("says nothing without a member list", () => {
        expect(entryAuthor(OTHER, false, OWNER, ME, new Map())).toBeNull();
    });
});
