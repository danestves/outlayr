import { describe, expect, it } from "vite-plus/test";

import { authorId, unsentOf, UNSENT_SEQ } from "./profile-authors";

const OWNER = "owner-1";
const ME = "me-2";
const OTHER = "other-3";

describe("authorId", () => {
    it("names the member the server stamped", () => {
        expect(authorId(OTHER, false, OWNER, ME)).toBe(OTHER);
    });

    it("falls back to the owner on a row that predates the stamp", () => {
        expect(authorId(null, false, OWNER, ME)).toBe(OWNER);
    });

    it("attributes a row still queued here to the viewer, even in a shared profile", () => {
        expect(authorId(undefined, true, OWNER, ME)).toBe(ME);
        expect(authorId(null, true, OWNER, ME)).toBe(ME);
    });

    it("says nothing on an unsent row with no signed-in viewer", () => {
        expect(authorId(null, true, OWNER, null)).toBeNull();
    });
});

describe("unsentOf", () => {
    it("recognizes the seq a shown row gets before its push", () => {
        expect(unsentOf({ seq: UNSENT_SEQ })).toBe(true);
        expect(unsentOf({ seq: 12 })).toBe(false);
    });
});
