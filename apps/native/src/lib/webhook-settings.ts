import { WEBHOOKS_EFFECTIVE_AT_MS } from "@outlayr/backend/confect/legal";
import type { WebhookStatus } from "@outlayr/backend/confect/webhooks.spec";

export type WebhookStatusView = typeof WebhookStatus.Type;
export type WebhookEndpoint = WebhookStatusView["endpoints"][number];
export type WebhookEndpointId = WebhookEndpoint["_id"];

export const WEBHOOKS_OPEN = Date.now() >= WEBHOOKS_EFFECTIVE_AT_MS;

export const INBOUND_TOKEN_PREFIX = "olh_";
export const SIGNING_SECRET_PREFIX = "whsec_";

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SECRET_BYTES = 32;
const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const INBOUND_PATH = "/hooks/in";

const isOkStatus = (status: number) => status >= 200 && status < 300;

export function encodeBase64Url(bytes: Uint8Array): string {
    let out = "";
    let buffer = 0;
    let bits = 0;
    for (const byte of bytes) {
        buffer = buffer * 256 + byte;
        bits += 8;
        while (bits >= 6) {
            const rest = bits - 6;
            const divisor = 2 ** rest;
            out += BASE64URL.charAt(Math.floor(buffer / divisor));
            buffer %= divisor;
            bits = rest;
        }
    }
    if (bits > 0) {
        out += BASE64URL.charAt(buffer * 2 ** (6 - bits));
    }
    return out;
}

export function mintWebhookSecret(
    prefix: typeof INBOUND_TOKEN_PREFIX | typeof SIGNING_SECRET_PREFIX,
    bytes: Uint8Array
) {
    return `${prefix}${encodeBase64Url(bytes)}`;
}

export function newInboundToken(): string {
    return mintWebhookSecret(INBOUND_TOKEN_PREFIX, randomBytes());
}

export function newSigningSecret(): string {
    return mintWebhookSecret(SIGNING_SECRET_PREFIX, randomBytes());
}

function randomBytes(): Uint8Array {
    // SAFETY: `require` is untyped and the asserted type is the same module's.
    const expoCrypto = require("expo-crypto") as typeof import("expo-crypto");
    return expoCrypto.getRandomBytes(SECRET_BYTES);
}

export function inboundEndpoint(siteUrl: string | undefined): { display: string; full: string } | null {
    if (!siteUrl) {
        return null;
    }
    const url = URL.parse(siteUrl);
    if (url === null) {
        return null;
    }
    const base = url.pathname.replace(/\/+$/, "");
    return {
        display: `${url.host}${base}${INBOUND_PATH}`,
        full: `${url.origin}${base}${INBOUND_PATH}`,
    };
}

export function endpointHost(url: string): string {
    return URL.parse(url)?.host ?? url;
}

export type EndpointState = "active" | "failing" | "off";

export function endpointState(endpoint: WebhookEndpoint): EndpointState {
    if (endpoint.disabledAt !== undefined) {
        return "off";
    }
    const failed = endpoint.lastDelivery !== undefined && !isOkStatus(endpoint.lastDelivery.status);
    return failed || endpoint.failures > 0 ? "failing" : "active";
}

export type WebhookAgo =
    | { key: "settings.webhooks.ago.now" }
    | { count: number; key: `settings.webhooks.ago.${"minutes" | "hours" | "days"}` };

export function webhookAgo(at: number, now: number): WebhookAgo {
    const minutes = Math.max(0, Math.floor((now - at) / MINUTE_MS));
    if (minutes < 1) {
        return { key: "settings.webhooks.ago.now" };
    }
    if (minutes < MINUTES_PER_HOUR) {
        return { count: minutes, key: "settings.webhooks.ago.minutes" };
    }
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    if (hours < HOURS_PER_DAY) {
        return { count: hours, key: "settings.webhooks.ago.hours" };
    }
    return { count: Math.floor(hours / HOURS_PER_DAY), key: "settings.webhooks.ago.days" };
}
