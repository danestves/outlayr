import { describe, expect, it } from "vite-plus/test";

import { carriedSlots, suggestionWrites } from "./merchant-lookup";
import type { LookupGuard, LookupSources } from "./merchant-lookup";

const ANSWER = { categoryId: "food", pendingCategory: null, pendingTagNames: [], tagIds: ["lunch"] };
const EMPTY = { categoryId: null, pendingCategory: null, pendingTagNames: [], tagIds: [] };

const unasked: LookupGuard = { asked: false, touched: new Set() };
const asked: LookupGuard = { asked: true, touched: new Set() };

const userPicked: LookupSources = { categorySource: "user", identitySource: "user", tagsSource: "user" };

describe("suggestionWrites", () => {
    it("leaves the user's picks to a late answer", () => {
        expect(suggestionWrites(unasked, userPicked, 0, ANSWER)).toStrictEqual({ category: "keep", tags: "keep" });
    });

    it("lets an asked lookup replace the user's picks, except what they touched since asking", () => {
        expect(suggestionWrites(asked, userPicked, 0, ANSWER)).toStrictEqual({ category: "fill", tags: "fill" });
        const touched: LookupGuard = { asked: true, touched: new Set(["category"]) };
        expect(suggestionWrites(touched, userPicked, 0, ANSWER)).toStrictEqual({ category: "keep", tags: "fill" });
    });

    it("keeps an edit's saved tags against an unasked answer", () => {
        const opened: LookupSources = { categorySource: "initial", identitySource: "initial", tagsSource: "initial" };
        expect(suggestionWrites(unasked, opened, 2, ANSWER).tags).toBe("keep");
        expect(suggestionWrites(unasked, opened, 0, ANSWER).tags).toBe("fill");
        expect(suggestionWrites(asked, opened, 2, ANSWER).tags).toBe("fill");
    });

    it("clears only suggested slots on an empty answer", () => {
        const suggested: LookupSources = {
            categorySource: "suggested",
            identitySource: "suggested",
            tagsSource: "initial",
        };
        expect(suggestionWrites(unasked, suggested, 0, EMPTY)).toStrictEqual({ category: "clear", tags: "keep" });
    });
});

describe("carriedSlots", () => {
    it("carries only suggested slots the user has not touched since asking", () => {
        const sources: LookupSources = { categorySource: "suggested", identitySource: "suggested", tagsSource: "user" };
        expect(carriedSlots(asked, sources, "cafe.com")).toStrictEqual({
            carryCategory: true,
            carryTags: false,
            domain: "cafe.com",
        });
        const touched: LookupGuard = { asked: true, touched: new Set(["category", "identity"]) };
        expect(carriedSlots(touched, sources, "cafe.com")).toStrictEqual({
            carryCategory: false,
            carryTags: false,
            domain: null,
        });
    });
});
