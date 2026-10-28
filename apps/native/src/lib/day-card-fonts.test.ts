import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

let mockDrawable = new Set<string>();
const mockMatched: string[] = [];

vi.mock("@shopify/react-native-skia", () => ({
    FontWeight: { Medium: 500, Normal: 400, SemiBold: 600 },
    Skia: {
        Font: (typeface: { family: string }) => ({
            measureText: () => ({ width: mockDrawable.has(typeface.family) ? 7 : 0 }),
        }),
        FontMgr: {
            System: () => ({
                matchFamilyStyle: (family: string) => {
                    mockMatched.push(family);
                    return { family };
                },
            }),
        },
    },
}));

function freshFonts(): Promise<typeof import("./day-card-fonts")> {
    vi.resetModules();
    return import("./day-card-fonts");
}

beforeEach(() => {
    mockMatched.length = 0;
});

describe("day card typefaces", () => {
    it("skips a family that matched nothing for the next one that draws", async () => {
        mockDrawable = new Set(["Helvetica Neue"]);

        const faces = await Effect.runPromise((await freshFonts()).loadCardTypefaces());

        expect(Object.values(faces)).toStrictEqual(Array.from({ length: 4 }, () => ({ family: "Helvetica Neue" })));
        expect(mockMatched.slice(0, 2)).toStrictEqual(["System", "Helvetica Neue"]);
    });

    it("rejects rather than drawing a blank card when no family draws", async () => {
        mockDrawable = new Set();

        await expect(Effect.runPromise((await freshFonts()).loadCardTypefaces())).rejects.toThrow(
            "No system face draws"
        );
    });
});
