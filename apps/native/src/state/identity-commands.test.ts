import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { IdentitySelection } from "@/components/identity-picker-shared";

import { adoptPickedPhoto } from "./identity-commands";

const mockPersist = vi.fn<(uri: string) => Promise<string>>();
const mockGlow = vi.fn<(uri: string) => Promise<string[]>>();

vi.mock<Partial<typeof import("@/lib/photo-storage")>>(import("@/lib/photo-storage"), () => ({
    persistPickedPhoto: (uri: string) => require("effect/Effect").promise(() => mockPersist(uri)),
}));
vi.mock<Partial<typeof import("@/theme/glow")>>(import("@/theme/glow"), () => ({
    glowFromImage: (uri: string) => require("effect/Effect").promise(() => mockGlow(uri)),
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn() }));

const EMPTY: IdentitySelection = { color: null, emoji: null, icon: null, photoColor: null, photoUri: null };

describe("adoptPickedPhoto", () => {
    beforeEach(() => {
        mockPersist.mockReset();
        mockGlow.mockReset();
    });

    it("stores the photo and takes its first hue as the glow", async () => {
        mockPersist.mockResolvedValue("file:///stored.jpg");
        mockGlow.mockResolvedValue(["#ff0000", "#00ff00"]);

        await expect(
            Effect.runPromise(adoptPickedPhoto({ ...EMPTY, color: "#123456", icon: "wallet" }, "file:///cache.jpg"))
        ).resolves.toStrictEqual({ ...EMPTY, color: "#123456", photoColor: "#ff0000", photoUri: "file:///stored.jpg" });
        expect(mockGlow).toHaveBeenCalledWith("file:///stored.jpg");
    });

    it("keeps the picked file when the copy fails, with no glow when unreadable", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        mockPersist.mockRejectedValue(new Error("disk full"));
        mockGlow.mockResolvedValue([]);

        await expect(Effect.runPromise(adoptPickedPhoto(EMPTY, "file:///cache.jpg"))).resolves.toStrictEqual({
            ...EMPTY,
            photoUri: "file:///cache.jpg",
        });
    });
});
