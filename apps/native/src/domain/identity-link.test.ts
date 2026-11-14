import { describe, expect, it } from "vite-plus/test";

import { readIdentityLink } from "./identity-link";

describe("readIdentityLink", () => {
    it("reduces a link to its domain and keeps a link with a path to try as an image", () => {
        expect(readIdentityLink("https://www.panaderiasanjose.com/menu?ref=ig")).toStrictEqual({
            domain: "panaderiasanjose.com",
            image: "https://www.panaderiasanjose.com/menu?ref=ig",
            kind: "website",
        });
        expect(readIdentityLink(" cdn.panaderia.com/logo.png ")).toStrictEqual({
            domain: "cdn.panaderia.com",
            image: "https://cdn.panaderia.com/logo.png",
            kind: "website",
        });
    });

    it("refuses profile links, whose domain is the platform's", () => {
        expect(readIdentityLink("instagram.com/panaderiasanjose")).toStrictEqual({
            kind: "refused",
            platform: "Instagram",
        });
        expect(readIdentityLink("https://m.facebook.com/panaderia")).toStrictEqual({
            kind: "refused",
            platform: "Facebook",
        });
        expect(readIdentityLink("https://wa.me/584121234567")).toStrictEqual({ kind: "refused", platform: "WhatsApp" });
    });

    it("refuses Google Maps links but keeps google.com itself", () => {
        expect(readIdentityLink("https://www.google.com/maps/place/Panaderia")).toStrictEqual({
            kind: "refused",
            platform: "Google Maps",
        });
        expect(readIdentityLink("https://google.com/")).toStrictEqual({
            domain: "google.com",
            image: null,
            kind: "website",
        });
    });

    it("does not mistake a lookalike for a platform", () => {
        expect(readIdentityLink("notinstagram.com")).toStrictEqual({
            domain: "notinstagram.com",
            image: null,
            kind: "website",
        });
    });

    it("waits on text that is not an address yet", () => {
        expect(readIdentityLink("panaderia")).toStrictEqual({ kind: "unreadable" });
    });
});
