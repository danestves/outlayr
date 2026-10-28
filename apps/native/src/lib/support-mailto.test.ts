import { describe, expect, it } from "vite-plus/test";

import { supportBody, supportMailto } from "./support-mailto";

const INFO = {
    appBuild: "42",
    appName: "Outlayr",
    appVersion: "1.2.0",
    deviceName: "iPhone",
    osName: "iOS",
    osVersion: "26.0",
};

describe("support email body", () => {
    it("keeps an unknown field readable rather than printing undefined", () => {
        const body = supportBody({ ...INFO, deviceName: "" });
        expect(body).toMatch(/Device: Unknown/);
        expect(body).not.toMatch(/undefined/);
    });
});

describe("support mailto", () => {
    it("percent-encodes the body so newlines never truncate the link", () => {
        const url = supportMailto("help@example.com", "Support Email", INFO);
        const [, body] = url.split("&body=");
        expect(body).toBeTruthy();
        expect(body).not.toMatch(/\n/);
        expect(decodeURIComponent(body)).toBe(supportBody(INFO));
    });

    it("escapes an ampersand in the body instead of starting a new parameter", () => {
        const url = supportMailto("help@example.com", "Support Email", {
            ...INFO,
            appName: "Out&layr",
        });
        expect(url.split("&body=")).toHaveLength(2);
        expect(url).toMatch(/Out%26layr/);
    });

    it("escapes an ampersand in the subject", () => {
        const url = supportMailto("help@example.com", "Bugs & Ideas", INFO);
        expect(url).toMatch(/subject=Bugs%20%26%20Ideas/);
        expect(url.split("&body=")).toHaveLength(2);
    });
});
