import { describe, expect, it } from "@jest/globals";

import { findTagByName, isUsableTagName, normalizeTagName, sortTags, TAG_NAME_LIMIT, tagLinkDiff } from "./tags";

describe("normalizing a tag name", () => {
    it("trims the edges", () => {
        expect(normalizeTagName("  work  ")).toBe("work");
    });

    it("collapses inner whitespace so one tag cannot become two", () => {
        expect(normalizeTagName("work   trip")).toBe("work trip");
    });

    it("cuts a name that has stopped being a label", () => {
        const long = "a".repeat(TAG_NAME_LIMIT + 10);
        expect(normalizeTagName(long)).toHaveLength(TAG_NAME_LIMIT);
    });

    it("reads whitespace alone as unusable", () => {
        expect(isUsableTagName("   ")).toBe(false);
        expect(isUsableTagName("work")).toBe(true);
    });
});

describe("comparing two names", () => {
    it("finds an existing tag rather than making a near-duplicate", () => {
        const tags = [{ id: "1", name: "Work" }];
        expect(findTagByName(tags, " work ")?.id).toBe("1");
    });
});

describe("ordering a tag list", () => {
    it("sorts by name, ignoring case", () => {
        const sorted = sortTags([
            { id: "1", name: "travel" },
            { id: "2", name: "Admin" },
            { id: "3", name: "work" },
        ]);
        expect(sorted.map((tag) => tag.name)).toStrictEqual(["Admin", "travel", "work"]);
    });
});

describe("diffing a row's tags", () => {
    it("attaches only what is new", () => {
        expect(tagLinkDiff(["a"], ["a", "b"])).toStrictEqual({
            attach: ["b"],
            detach: [],
        });
    });

    it("detaches only what is gone", () => {
        expect(tagLinkDiff(["a", "b"], ["a"])).toStrictEqual({
            attach: [],
            detach: ["b"],
        });
    });

    it("writes nothing when nothing moved", () => {
        expect(tagLinkDiff(["a", "b"], ["b", "a"])).toStrictEqual({
            attach: [],
            detach: [],
        });
    });
});
