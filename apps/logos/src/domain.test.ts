import { describe, expect, it } from "vite-plus/test";

import { normalizeDomain } from "./domain";

describe("normalizeDomain", () => {
    it("files www and case variants under one logo", () => {
        expect(normalizeDomain("WWW.Netflix.com")).toBe("netflix.com");
    });

    it("keeps a subdomain that is its own brand", () => {
        expect(normalizeDomain("music.youtube.com")).toBe("music.youtube.com");
    });

    it.each(["../transaction-photos/user/a.jpg", "127.0.0.1", "localhost", "netflix.com/x", "a b.com"])(
        "refuses %s",
        (raw) => {
            expect(normalizeDomain(raw)).toBeNull();
        }
    );
});
