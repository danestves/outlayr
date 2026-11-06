import { describe, expect, it } from "vite-plus/test";

import { websiteDomain } from "./merchant-website";

describe("websiteDomain", () => {
    it.each([
        ["latentacion.wuplify.com", "latentacion.wuplify.com"],
        ["  HTTPS://www.Netflix.com/es/?ref=1#top ", "netflix.com"],
        ["http://shop.example.co.uk:8080/cart", "shop.example.co.uk"],
        ["https://user@example.com", "example.com"],
    ])("reads %s as a host", (input, host) => {
        expect(websiteDomain(input)).toBe(host);
    });

    it.each(["", "la tentacion", "latentacion", "127.0.0.1", "https://evil.com@"])("refuses %s", (input) => {
        expect(websiteDomain(input)).toBeNull();
    });
});
