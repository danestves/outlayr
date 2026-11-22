import { describe, expect, it } from "vite-plus/test";

import {
    encodeBase64Url,
    endpointAddress,
    endpointState,
    INBOUND_TOKEN_PREFIX,
    inboundEndpoint,
    mintWebhookSecret,
    SIGNING_SECRET_PREFIX,
    webhookAgo,
} from "./webhook-settings";
import type { WebhookEndpoint } from "./webhook-settings";

const SECRET_FORMAT = /^[A-Za-z0-9_-]{32,128}$/;
const BYTES = new Uint8Array(32).fill(251);

function endpoint(overrides: Omit<Partial<WebhookEndpoint>, "_id"> = {}): WebhookEndpoint {
    return {
        _id: "endpoint" as WebhookEndpoint["_id"],
        createdAt: 0,
        failures: 0,
        url: "https://example.com/hooks",
        ...overrides,
    };
}

describe("webhook secrets", () => {
    it("mints a token the backend accepts, with no padding or plus signs", () => {
        const token = mintWebhookSecret(INBOUND_TOKEN_PREFIX, BYTES);
        expect(token.startsWith(INBOUND_TOKEN_PREFIX)).toBe(true);
        expect(token.slice(INBOUND_TOKEN_PREFIX.length)).not.toMatch(/[=+/]/);
        expect(token).toMatch(SECRET_FORMAT);
        expect(mintWebhookSecret(SIGNING_SECRET_PREFIX, BYTES)).toMatch(SECRET_FORMAT);
    });

    it("encodes base64url, not standard base64", () => {
        expect(encodeBase64Url(new Uint8Array([251, 255]))).toBe("-_8");
        expect(encodeBase64Url(new Uint8Array([]))).toBe("");
    });
});

describe("inbound endpoint", () => {
    it("keeps a path on the site URL and appends the inbound route", () => {
        expect(inboundEndpoint("https://calm-otter-12.convex.site/")).toStrictEqual({
            display: "calm-otter-12.convex.site/hooks/in",
            full: "https://calm-otter-12.convex.site/hooks/in",
        });
    });
});

describe("endpoint address", () => {
    it("keeps the path so two addresses on one host stay distinct", () => {
        const first = endpointAddress("https://hooks.zapier.com/hooks/catch/123/abc");
        const second = endpointAddress("https://hooks.zapier.com/hooks/catch/456/def");
        expect(first).toBe("hooks.zapier.com/hooks/catch/123/abc");
        expect(first).not.toBe(second);
        expect(endpointAddress("https://example.com/hooks/")).toBe("example.com/hooks/");
        expect(endpointAddress("https://example.com/")).toBe("example.com");
    });
});

describe("endpoint state", () => {
    it("reads off before a failure, so a turned-off endpoint never looks active", () => {
        expect(endpointState(endpoint({ disabledAt: 10, lastDelivery: { at: 5, status: 200 } }))).toBe("off");
    });

    it("keeps a delivered endpoint active", () => {
        expect(endpointState(endpoint({ lastDelivery: { at: 5, status: 204 } }))).toBe("active");
        expect(endpointState(endpoint())).toBe("active");
    });

    it("reads failing on a non-2xx last delivery or a live failure count", () => {
        expect(endpointState(endpoint({ lastDelivery: { at: 5, status: 500 } }))).toBe("failing");
        expect(endpointState(endpoint({ failures: 3 }))).toBe("failing");
    });
});

describe("webhookAgo", () => {
    const now = 10 * 24 * 60 * 60 * 1000;

    it("rounds down through minutes, hours and days", () => {
        expect(webhookAgo(now - 10_000, now)).toStrictEqual({ key: "settings.webhooks.ago.now" });
        expect(webhookAgo(now - 5 * 60_000, now)).toStrictEqual({ count: 5, key: "settings.webhooks.ago.minutes" });
        expect(webhookAgo(now - 3 * 60 * 60_000, now)).toStrictEqual({ count: 3, key: "settings.webhooks.ago.hours" });
        expect(webhookAgo(now - 2 * 24 * 60 * 60_000, now)).toStrictEqual({
            count: 2,
            key: "settings.webhooks.ago.days",
        });
    });
});
