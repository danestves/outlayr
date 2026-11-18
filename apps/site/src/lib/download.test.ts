import { APP_STORE_URL } from "@outlayr/shared/urls";
import { expect, it } from "vite-plus/test";

import { downloadTarget, isIpadAsMac, opensStore } from "./download";

const TIKTOK_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_37.5.0 BytedanceWebview/d8a21c6";
const TIKTOK_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 trill_370504 BytedanceWebview/d8a21c6";
const DESKTOP =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ad = new URLSearchParams({ fbclid: "x1", utm_campaign: "boost-factura", utm_source: "tiktok" });

it("sends an iPhone in TikTok's browser to the App Store", () => {
    expect(downloadTarget(TIKTOK_IPHONE, ad, "/es")).toBe(APP_STORE_URL);
});

it("sends Android to Play with only the utm pairs in the referrer", () => {
    const url = new URL(downloadTarget(TIKTOK_ANDROID, ad, "/es"));
    expect(url.searchParams.get("id")).toBe("com.tryoutlayr.app");
    expect(Object.fromEntries(new URLSearchParams(url.searchParams.get("referrer") ?? ""))).toEqual({
        utm_campaign: "boost-factura",
        utm_source: "tiktok",
    });
});

it("sends anything else to the homepage's store badges with its query intact", () => {
    expect(downloadTarget(DESKTOP, ad, "/es")).toBe(`/es?${ad.toString()}#get-app`);
    expect(downloadTarget(DESKTOP, new URLSearchParams(), "/")).toBe("/#get-app");
});

it("keeps the header button on the link only where /download reaches a store", () => {
    for (const userAgent of [TIKTOK_IPHONE, TIKTOK_ANDROID, DESKTOP]) {
        const target = downloadTarget(userAgent, new URLSearchParams(), "/");
        expect(opensStore(userAgent)).toBe(!target.startsWith("/"));
    }
});

it("tells an iPad asking for the desktop site from a Mac", () => {
    expect(isIpadAsMac(DESKTOP, 5)).toBe(true);
    expect(isIpadAsMac(DESKTOP, 0)).toBe(false);
    expect(isIpadAsMac(TIKTOK_ANDROID, 5)).toBe(false);
});
