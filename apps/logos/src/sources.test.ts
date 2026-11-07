import { describe, expect, it } from "vite-plus/test";

import { findLogo, siteIconUrls } from "./sources";
import type { Fetcher } from "./sources";

function png(size: number): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(1024);
    bytes.set([0x89, 0x50, 0x4e, 0x47]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, size);
    view.setUint32(20, size);
    return bytes;
}

const image = (size: number) => new Response(png(size), { headers: { "content-type": "image/png" } });
const notFound = () => new Response(null, { status: 404 });
const blocked = () => new Response(null, { status: 403 });

const fetcher =
    (route: (url: string) => Response): Fetcher =>
    (url) =>
        Promise.resolve(route(url));

describe("findLogo", () => {
    it("reads a site that only answers without www", async () => {
        const home = '<link rel="icon" href="https://shop.example.com/logo.png">';
        const result = await findLogo(
            fetcher((url) => {
                if (url === "https://shop.example.com/") {
                    return new Response(home);
                }
                return url === "https://shop.example.com/logo.png" ? image(192) : notFound();
            }),
            "shop.example.com"
        );
        expect(result.kind === "found" && result.logo.source).toBe("site");
    });

    it("keeps DuckDuckGo's file when it is larger than Google's", async () => {
        const result = await findLogo(
            fetcher((url) => (url.includes("duckduckgo") ? image(256) : image(128))),
            "ulta.com"
        );
        expect(result.kind === "found" && result.logo.source).toBe("duckduckgo");
    });

    it("retries Google on www when the bare domain has no icon", async () => {
        const result = await findLogo(
            fetcher((url) =>
                url === "https://www.google.com/s2/favicons?domain=www.locatel.com.ve&sz=128" ? image(128) : notFound()
            ),
            "locatel.com.ve"
        );
        expect(result.kind === "found" && result.logo.size).toBe(128);
    });

    it("keeps a small icon over Wikidata's wide logo", async () => {
        const called: string[] = [];
        const result = await findLogo(
            fetcher((url) => {
                called.push(url);
                return new URL(url).hostname === "www.google.com" ? image(16) : notFound();
            }),
            "ebay.com"
        );
        expect(result.kind === "found" && result.logo.source).toBe("google");
        expect(called.some((url) => url.includes("wikidata"))).toBeFalsy();
    });

    it("refuses a file claiming an impossible size", async () => {
        const result = await findLogo(
            fetcher((url) => (new URL(url).hostname === "www.google.com" ? image(8192) : notFound())),
            "xfinity.com"
        );
        expect(result.kind).not.toBe("found");
    });

    it("uses Wikidata when no source has an icon", async () => {
        const result = await findLogo(
            fetcher((url) => {
                if (new URL(url).hostname === "query.wikidata.org") {
                    return Response.json({
                        results: { bindings: [{ logo: { value: "http://commons.wikimedia.org/x.svg" } }] },
                    });
                }
                if (new URL(url).hostname === "commons.wikimedia.org") {
                    return image(256);
                }
                return notFound();
            }),
            "ebay.com"
        );
        expect(result.kind === "found" && result.logo.source).toBe("wikidata");
    });

    it("reports a real miss only when every source answered", async () => {
        const answered = fetcher((url) =>
            url.includes("wikidata") ? Response.json({ results: { bindings: [] } }) : notFound()
        );
        expect((await findLogo(answered, "nothing.example")).kind).toBe("missing");
    });

    it("does not call a blocked lookup a miss", async () => {
        expect((await findLogo(fetcher(blocked), "blocked.example")).kind).toBe("unknown");
    });
});

describe("siteIconUrls", () => {
    it("reads icons relative to the page and skips Safari's one-colour mask", () => {
        const html = `<link rel="apple-touch-icon" href="/touch.png"><link rel="mask-icon" href="/mask.svg"><link rel="icon" href="https://cdn.example/i.png">`;
        expect(siteIconUrls(html, "https://www.example.com/")).toStrictEqual([
            "https://www.example.com/apple-touch-icon.png",
            "https://www.example.com/touch.png",
            "https://cdn.example/i.png",
        ]);
    });
});
