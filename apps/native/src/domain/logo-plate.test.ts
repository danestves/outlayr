import { describe, expect, it } from "vite-plus/test";

import { relativeLuminance } from "@/theme/shade";

import { logoPlate } from "./logo-plate";
import type { LogoPixels } from "./logo-plate";

type Rgba = [number, number, number, number];

const CLEAR: Rgba = [0, 0, 0, 0];
const SIDE = 20;

function image(paint: (x: number, y: number) => Rgba): LogoPixels {
    const data = new Uint8Array(SIDE * SIDE * 4);
    for (let y = 0; y < SIDE; y += 1) {
        for (let x = 0; x < SIDE; x += 1) {
            data.set(paint(x, y), (y * SIDE + x) * 4);
        }
    }
    return { data, height: SIDE, width: SIDE };
}

/** A mark of `color` over x 2..7, y 2..7 on transparency: small, and off centre. */
const markOf = (color: Rgba) => image((x, y) => (x >= 2 && x < 8 && y >= 2 && y < 8 ? color : CLEAR));

function rgb(hex: string): [number, number, number] {
    return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255) as [number, number, number];
}

function plateOf(pixels: LogoPixels) {
    const plate = logoPlate(pixels);
    if (plate.kind !== "plate") {
        throw new Error("expected a plate");
    }
    return plate;
}

describe("logoPlate", () => {
    it("puts a dark transparent mark on a light plate, trimmed and centred", () => {
        const plate = plateOf(markOf([0, 0, 0, 255]));

        expect(relativeLuminance(rgb(plate.color))).toBeGreaterThan(0.8);
        expect(plate.source).toStrictEqual({ height: 0.3, width: 0.3, x: 0.1, y: 0.1 });
        expect(plate.target.x).toBeCloseTo(0.2);
        expect(plate.target.width).toBeCloseTo(0.6);
    });

    it("puts a white transparent mark on a dark plate", () => {
        expect(relativeLuminance(rgb(plateOf(markOf([255, 255, 255, 255])).color))).toBeLessThan(0.05);
    });

    it("tints the plate with the hue of a one-colour mark", () => {
        const [red, , blue] = rgb(plateOf(markOf([30, 60, 220, 255])).color);

        expect(blue).toBeGreaterThan(red);
    });

    it("draws an icon with transparent rounded corners at full size", () => {
        const corner = (x: number, y: number) => (x < 2 || x >= SIDE - 2) && (y < 2 || y >= SIDE - 2);
        const plate = plateOf(image((x, y) => (corner(x, y) ? CLEAR : [30, 60, 220, 255])));

        expect(plate.target).toStrictEqual({ height: 1, width: 1, x: 0, y: 0 });
    });

    it("pads a solid logo that runs into its edges with its own background", () => {
        const plate = plateOf(image((_x, y) => (y >= 8 && y < 12 ? [220, 30, 30, 255] : [255, 255, 255, 255])));

        expect(plate.color).toBe("#ffffff");
        expect(plate.target.width).toBeCloseTo(0.78);
        expect(plate.target.height).toBeCloseTo(0.156);
    });

    it("keeps a solid logo that already has room around it", () => {
        const padded = image((x, y) =>
            x >= 5 && x < 15 && y >= 5 && y < 15 ? [220, 30, 30, 255] : [255, 255, 255, 255]
        );

        expect(logoPlate(padded).kind).toBe("keep");
    });
});
