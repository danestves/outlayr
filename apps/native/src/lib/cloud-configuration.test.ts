import { describe, expect, it } from "@jest/globals";

import { readConvexUrl } from "./cloud-configuration";

describe("readConvexUrl", () => {
    it("strips pasted tabs and newlines", () => {
        expect(readConvexUrl("K", " https://a.convex.\tcloud\r\n", "example.convex.cloud")).toBe(
            "https://a.convex.cloud"
        );
    });

    it("treats an empty value as unset", () => {
        expect(readConvexUrl("K", "", "example.convex.cloud")).toBeUndefined();
        expect(readConvexUrl("K", undefined, "example.convex.cloud")).toBeUndefined();
    });

    it("rejects the placeholder host with a message that says what to replace", () => {
        expect(() => readConvexUrl("K", "https://example.convex.cloud", "example.convex.cloud")).toThrow(
            "Replace the example.convex.cloud placeholder before running the app"
        );
    });

    it("rejects a value that is not a URL", () => {
        expect(() => readConvexUrl("K", "  \n", "example.convex.cloud")).toThrow("Invalid URL");
    });
});
