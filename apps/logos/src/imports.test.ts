import { describe, expect, it } from "vite-plus/test";

import { normalizeDomain } from "./domain";
import { importImage, isImportedDomain, readImageUrl } from "./imports";
import type { Fetcher } from "./sources";

function png(size: number, fill = 0): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(1024).fill(fill);
    bytes.set([0x89, 0x50, 0x4e, 0x47]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, size);
    view.setUint32(20, size);
    return bytes;
}

const serving =
    (body: Uint8Array<ArrayBuffer> | string, contentType: string): Fetcher =>
    () =>
        Promise.resolve(new Response(body, { headers: { "content-type": contentType } }));

const url = (raw: string) => {
    const parsed = readImageUrl(raw);
    if (parsed === null) {
        throw new Error(`unreadable test url ${raw}`);
    }
    return parsed;
};

describe("importImage", () => {
    it("files the same image under the same domain, which the logo route accepts", async () => {
        const first = await importImage(serving(png(256), "image/png"), url("https://cdn.example.com/a.png"));
        const again = await importImage(serving(png(256), "image/png"), url("https://other.example.org/b"));
        const other = await importImage(serving(png(256, 1), "image/png"), url("https://cdn.example.com/a.png"));
        if (first.kind !== "imported" || again.kind !== "imported" || other.kind !== "imported") {
            throw new Error("expected three imports");
        }
        expect(again.domain).toBe(first.domain);
        expect(other.domain).not.toBe(first.domain);
        expect(normalizeDomain(first.domain)).toBe(first.domain);
        expect(isImportedDomain(first.domain)).toBe(true);
    });

    it("rejects a web page, so the app falls back to the site's logo", async () => {
        const page = await importImage(serving("<html></html>", "text/html"), url("https://shop.example.com/menu"));
        expect(page.kind).toBe("rejected");
    });

    it("rejects an error page served as an image", async () => {
        const fake = await importImage(serving(`<html>${"x".repeat(900)}</html>`, "image/png"), url("https://a.co/x"));
        expect(fake.kind).toBe("rejected");
    });
});

describe("readImageUrl", () => {
    it("refuses other schemes and its own host", () => {
        expect(readImageUrl("ftp://cdn.example.com/a.png")).toBeNull();
        expect(readImageUrl("https://logos.tryoutlayr.com/merchants/x.com")).toBeNull();
        expect(readImageUrl("not a link")).toBeNull();
    });
});
