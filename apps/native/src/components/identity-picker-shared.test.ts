import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { CATEGORY_PALETTE } from "@/data/categories-core";

import {
    adoptPickedPhoto,
    CATEGORY_TABS,
    initialIdentityTab,
    pickedPhotoUri,
    TRANSACTION_TABS,
    withEmoji,
    withIcon,
} from "./identity-picker-shared";
import type { IdentitySelection } from "./identity-picker-shared";

const mockPersist = jest.fn<(uri: string) => Promise<string>>();
const mockGlow = jest.fn<(uri: string) => Promise<string[]>>();

jest.mock<Partial<typeof import("@/lib/photo-storage")>>("@/lib/photo-storage", () => ({
    persistPickedPhoto: (uri: string) => require("effect/Effect").promise(() => mockPersist(uri)),
}));
jest.mock<Partial<typeof import("@/theme/glow")>>("@/theme/glow", () => ({
    glowFromImage: (uri: string) => require("effect/Effect").promise(() => mockGlow(uri)),
}));

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

describe("adoptPickedPhoto", () => {
    beforeEach(() => {
        mockPersist.mockReset();
        mockGlow.mockReset();
    });

    it("stores the photo and takes its first hue as the glow", async () => {
        mockPersist.mockResolvedValue("file:///stored.jpg");
        mockGlow.mockResolvedValue(["#ff0000", "#00ff00"]);

        await expect(
            adoptPickedPhoto({ ...EMPTY, color: "#123456", icon: "wallet" }, "file:///cache.jpg")
        ).resolves.toStrictEqual({ ...EMPTY, color: "#123456", photoColor: "#ff0000", photoUri: "file:///stored.jpg" });
        expect(mockGlow).toHaveBeenCalledWith("file:///stored.jpg");
    });

    it("keeps the picked file when the copy fails, with no glow when unreadable", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        mockPersist.mockRejectedValue(new Error("disk full"));
        mockGlow.mockResolvedValue([]);

        await expect(adoptPickedPhoto(EMPTY, "file:///cache.jpg")).resolves.toStrictEqual({
            ...EMPTY,
            photoUri: "file:///cache.jpg",
        });
    });
});
