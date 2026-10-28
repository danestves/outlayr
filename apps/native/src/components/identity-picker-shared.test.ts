import { describe, expect, it } from "vite-plus/test";

import { CATEGORY_PALETTE } from "@/data/categories-core";

import {
    CATEGORY_TABS,
    initialIdentityTab,
    pickedPhotoUri,
    TRANSACTION_TABS,
    withEmoji,
    withIcon,
} from "./identity-picker-shared";
import type { IdentitySelection } from "./identity-picker-shared";

const EMPTY: IdentitySelection = { color: null, emoji: null, icon: null, photoColor: null, photoUri: null };
const PHOTO: IdentitySelection = {
    color: "#123456",
    emoji: null,
    icon: null,
    photoColor: "#abcdef",
    photoUri: "file:///a.jpg",
};

describe("initialIdentityTab", () => {
    it("opens on the tab holding the current pick", () => {
        expect(initialIdentityTab({ ...EMPTY, emoji: "🍕" }, TRANSACTION_TABS)).toBe("emoji");
        expect(initialIdentityTab(PHOTO, TRANSACTION_TABS)).toBe("photo");
    });

    it("falls back to the first tab when the pick has no tab here", () => {
        expect(initialIdentityTab(PHOTO, CATEGORY_TABS)).toBe("icons");
        expect(initialIdentityTab(EMPTY, TRANSACTION_TABS)).toBe("photo");
    });
});

describe("picks", () => {
    it("an emoji replaces a photo and keeps the colour", () => {
        expect(withEmoji(PHOTO, "🍕")).toStrictEqual({ ...EMPTY, color: "#123456", emoji: "🍕" });
    });

    it("an icon with no colour yet takes the palette's first", () => {
        expect(withIcon(EMPTY, "wallet")).toStrictEqual({ ...EMPTY, color: CATEGORY_PALETTE[0], icon: "wallet" });
    });
});

describe("pickedPhotoUri", () => {
    it("reads the first asset of a finished pick", () => {
        const result = { assets: [{ height: 1, uri: "file:///b.jpg", width: 1 }], canceled: false as const };
        expect(pickedPhotoUri(result)).toBe("file:///b.jpg");
    });

    it("is null for a cancel, an error, or nothing pending", () => {
        expect(pickedPhotoUri({ assets: null, canceled: true })).toBeNull();
        expect(pickedPhotoUri({ code: "ERR", message: "denied" })).toBeNull();
        expect(pickedPhotoUri(null)).toBeNull();
    });
});
