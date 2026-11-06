import { describe, expect, it } from "vite-plus/test";

import { imageInfo } from "./image";

function png(width: number, height: number): Uint8Array {
    const bytes = new Uint8Array(32);
    bytes.set([0x89, 0x50, 0x4e, 0x47]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
    return bytes;
}

function ico(sizes: readonly number[]): Uint8Array {
    const bytes = new Uint8Array(6 + sizes.length * 16);
    bytes.set([0, 0, 1, 0, sizes.length, 0]);
    for (const [index, size] of sizes.entries()) {
        bytes[6 + index * 16] = size % 256;
        bytes[7 + index * 16] = size % 256;
    }
    return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
    const bytes = new Uint8Array(32);
    bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08]);
    const view = new DataView(bytes.buffer);
    view.setUint16(13, height);
    view.setUint16(15, width);
    return bytes;
}

describe("imageInfo", () => {
    it("ranks a wide PNG by its shorter side", () => {
        expect(imageInfo(png(512, 64))).toStrictEqual({ contentType: "image/png", size: 64 });
    });

    it("reads the largest ICO frame, where a width byte of 0 means 256", () => {
        expect(imageInfo(ico([16, 48, 256]))?.size).toBe(256);
    });

    it("finds a JPEG's size past the segments ahead of its frame header", () => {
        expect(imageInfo(jpeg(300, 128))).toStrictEqual({ contentType: "image/jpeg", size: 128 });
    });

    it("refuses an HTML error page", () => {
        expect(imageInfo(new TextEncoder().encode("<!doctype html><html></html>"))).toBeNull();
    });
});
