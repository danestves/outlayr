import { WEBHOOKS_EFFECTIVE_AT_MS } from "@outlayr/backend/confect/legal";
import type { WebhookStatus } from "@outlayr/backend/confect/webhooks.spec";

export type WebhookStatusView = typeof WebhookStatus.Type;
export type WebhookEndpoint = WebhookStatusView["endpoints"][number];

export const INBOUND_TOKEN_PREFIX = "olh_";
export const SIGNING_SECRET_PREFIX = "whsec_";

const BASE64_PADDING = /[=]+$/;
const SECRET_BYTES = 32;
const INBOUND_PATH = "/hooks/in";

export function webhooksOpen(now: number): boolean {
    return now >= WEBHOOKS_EFFECTIVE_AT_MS;
}

function encodeBase64Url(bytes: Uint8Array): string {
    return btoa(String.fromCodePoint(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(BASE64_PADDING, "");
}

const mint = (prefix: string) => `${prefix}${encodeBase64Url(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)))}`;

export const newInboundToken = () => mint(INBOUND_TOKEN_PREFIX);

export const newSigningSecret = () => mint(SIGNING_SECRET_PREFIX);

export function inboundEndpoint(siteUrl: string | undefined): { display: string; full: string } | null {
    if (!siteUrl) {
        return null;
    }
    let url: URL;
    try {
        url = new URL(siteUrl);
    } catch {
        return null;
    }
    const base = url.pathname.replace(/\/+$/, "");
    return {
        display: `${url.host}${base}${INBOUND_PATH}`,
        full: `${url.origin}${base}${INBOUND_PATH}`,
    };
}

export function endpointAddress(url: string): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname === "/" ? "" : parsed.pathname;
        return `${parsed.host}${path}`;
    } catch {
        return url;
    }
}

export type EndpointState = "active" | "failing" | "off";

const isOkStatus = (status: number) => status >= 200 && status < 300;

export function endpointState(endpoint: WebhookEndpoint): EndpointState {
    if (endpoint.disabledAt !== undefined) {
        return "off";
    }
    const failed = endpoint.lastDelivery !== undefined && !isOkStatus(endpoint.lastDelivery.status);
    return failed || endpoint.failures > 0 ? "failing" : "active";
}
