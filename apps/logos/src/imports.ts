import { normalizeDomain } from "./domain";
import { imageInfo } from "./image";
import type { ImageInfo } from "./image";
import { BROWSER_AGENT } from "./sources";
import type { Fetcher } from "./sources";

// A domain no site owns, so a pasted image is stored, shared and read exactly like a scraped logo,
// by every app version.
const IMPORTED_SUFFIX = ".img.tryoutlayr.com";
const OWN_HOST = /(^|\.)tryoutlayr\.com$/;
// Matches `MIN_BYTES` and `MAX_BYTES` in the app's logo acceptance.
const MIN_BYTES = 512;
const MAX_BYTES = 524_288;
const MAX_SIZE = 4096;
const TIMEOUT_MS = 4000;
const HASH_BYTES = 10;

export type ImportResult =
    | ({ kind: "imported"; bytes: Uint8Array; domain: string } & ImageInfo)
    | { kind: "rejected" }
    | { kind: "unknown" };

export function isImportedDomain(domain: string): boolean {
    return domain.endsWith(IMPORTED_SUFFIX);
}

export function readImageUrl(raw: string): URL | null {
    if (!URL.canParse(raw)) {
        return null;
    }
    const url = new URL(raw);
    const host = normalizeDomain(url.hostname);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || host === null || OWN_HOST.test(host)) {
        return null;
    }
    return url;
}

const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function rejected(response: Response): Promise<ImportResult> {
    await response.body?.cancel();
    return { kind: "rejected" };
}

export async function importImage(fetcher: Fetcher, url: URL): Promise<ImportResult> {
    try {
        const response = await fetcher(url.href, {
            headers: { "user-agent": BROWSER_AGENT },
            redirect: "follow",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) {
            await response.body?.cancel();
            return { kind: response.status >= 500 ? "unknown" : "rejected" };
        }
        const declared = Number(response.headers.get("content-length") ?? 0);
        const type = response.headers.get("content-type")?.toLowerCase() ?? "";
        if (!type.startsWith("image/") || declared > MAX_BYTES) {
            return await rejected(response);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const info = bytes.length < MIN_BYTES || bytes.length > MAX_BYTES ? null : imageInfo(bytes);
        if (info === null || info.size > MAX_SIZE) {
            return { kind: "rejected" };
        }
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        return { ...info, bytes, domain: `${hex(digest.slice(0, HASH_BYTES))}${IMPORTED_SUFFIX}`, kind: "imported" };
    } catch {
        return { kind: "unknown" };
    }
}
