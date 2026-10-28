import { createHash } from "node:crypto";

import { describe, expect, it } from "vite-plus/test";

import { uuidV5 } from "./uuid5";

const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

describe("uuidV5", () => {
    it("matches the RFC 4122 published vectors", () => {
        expect(uuidV5("python.org", DNS_NAMESPACE)).toBe("886313e1-3b8a-5372-9b90-0c9aee199e5d");
        expect(uuidV5("http://python.org/", URL_NAMESPACE)).toBe("4c565f0d-3f5a-5890-b41b-20cf47701c5e");
    });

    it("handles multi-byte names", () => {
        const expected = createHash("sha1")
            .update(Buffer.from(DNS_NAMESPACE.replaceAll("-", ""), "hex"))
            .update("café — 日本", "utf-8")
            .digest();
        expected[6] = (expected[6] & 0x0f) | 0x50;
        expected[8] = (expected[8] & 0x3f) | 0x80;
        const hex = expected.subarray(0, 16).toString("hex");

        expect(uuidV5("café — 日本", DNS_NAMESPACE).replaceAll("-", "")).toBe(hex);
    });
});
