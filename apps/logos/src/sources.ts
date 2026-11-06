import { imageInfo } from "./image";
import type { ImageInfo } from "./image";

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface FoundLogo extends ImageInfo {
    bytes: Uint8Array;
    source: string;
}

export type LookupResult = { kind: "found"; logo: FoundLogo } | { kind: "missing" } | { kind: "unknown" };

const SHARP_SIZE = 120;
// Matches `MIN_BYTES` in the app's logo acceptance.
const MIN_BYTES = 512;
// Matches `MAX_BYTES` in the app's logo acceptance.
const MAX_BYTES = 524_288;
const MAX_SIZE = 4096;
const MAX_SITE_ICONS = 6;
const SOURCE_TIMEOUT_MS = 3000;
const BROWSER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const WIKIMEDIA_AGENT = "OutlayrLogos/1.0 (https://tryoutlayr.com; support@tryoutlayr.com)";

const LINK_TAG = /<link\b[^>]*>/gi;
const REL_ATTR = /\brel\s*=\s*["']([^"']+)["']/i;
const HREF_ATTR = /\bhref\s*=\s*["']([^"']+)["']/i;

type Attempt = { kind: "found"; logo: FoundLogo } | { kind: "missing" } | { kind: "unknown" };

const NOT_FOUND_STATUSES = new Set([404, 410]);

async function attempt(fetcher: Fetcher, url: string, source: string, agent = BROWSER_AGENT): Promise<Attempt> {
    try {
        const response = await fetcher(url, {
            headers: { "user-agent": agent },
            redirect: "follow",
            signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        });
        if (!response.ok) {
            return { kind: NOT_FOUND_STATUSES.has(response.status) ? "missing" : "unknown" };
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length < MIN_BYTES || bytes.length > MAX_BYTES) {
            return { kind: "missing" };
        }
        const info = imageInfo(bytes);
        return info === null || info.size > MAX_SIZE
            ? { kind: "missing" }
            : { kind: "found", logo: { ...info, bytes, source } };
    } catch {
        return { kind: "unknown" };
    }
}

const larger = (a: FoundLogo | null, b: FoundLogo | null) => {
    if (a === null || b === null) {
        return a ?? b;
    }
    return b.size > a.size ? b : a;
};

async function withWww(domain: string, lookup: (host: string) => Promise<Attempt>): Promise<Attempt> {
    const bare = await lookup(domain);
    if (bare.kind === "found" && bare.logo.size >= SHARP_SIZE) {
        return bare;
    }
    const www = await lookup(`www.${domain}`);
    if (bare.kind === "found" && www.kind === "found") {
        return www.logo.size > bare.logo.size ? www : bare;
    }
    if (bare.kind === "found" || www.kind === "found") {
        return bare.kind === "found" ? bare : www;
    }
    return bare.kind === "unknown" || www.kind === "unknown" ? { kind: "unknown" } : { kind: "missing" };
}

const google = (fetcher: Fetcher, domain: string) =>
    withWww(domain, (host) => attempt(fetcher, `https://www.google.com/s2/favicons?domain=${host}&sz=128`, "google"));

const duckDuckGo = (fetcher: Fetcher, domain: string) =>
    withWww(domain, (host) => attempt(fetcher, `https://icons.duckduckgo.com/ip3/${host}.ico`, "duckduckgo"));

export function siteIconUrls(html: string, base: string): string[] {
    const urls = [new URL("/apple-touch-icon.png", base).href];
    for (const tag of html.match(LINK_TAG) ?? []) {
        const rel = REL_ATTR.exec(tag)?.[1]?.toLowerCase() ?? "";
        const href = HREF_ATTR.exec(tag)?.[1];
        if (href !== undefined && rel.includes("icon") && !rel.includes("mask") && URL.canParse(href, base)) {
            urls.push(new URL(href, base).href);
        }
    }
    return [...new Set(urls)].filter((url) => url.startsWith("https://")).slice(0, MAX_SITE_ICONS);
}

async function homePage(fetcher: Fetcher, url: string): Promise<{ base: string; page: string } | null> {
    try {
        const response = await fetcher(url, {
            headers: { "user-agent": BROWSER_AGENT },
            redirect: "follow",
            signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
        });
        return response.ok ? { base: response.url || url, page: await response.text() } : null;
    } catch {
        return null;
    }
}

async function ownSite(fetcher: Fetcher, domain: string): Promise<Attempt> {
    const home = (await homePage(fetcher, `https://www.${domain}/`)) ?? (await homePage(fetcher, `https://${domain}/`));
    if (home === null) {
        return { kind: "missing" };
    }
    const { base, page } = home;
    const attempts = await Promise.all(siteIconUrls(page, base).map((url) => attempt(fetcher, url, "site")));
    const best = attempts.reduce<FoundLogo | null>(
        (found, a) => (a.kind === "found" ? larger(found, a.logo) : found),
        null
    );
    return best === null ? { kind: "missing" } : { kind: "found", logo: best };
}

async function wikidata(fetcher: Fetcher, domain: string): Promise<Attempt> {
    const sites = [`https://www.${domain}/`, `https://www.${domain}`, `https://${domain}/`, `https://${domain}`];
    const query = `SELECT ?logo WHERE { VALUES ?site { ${sites.map((site) => `<${site}>`).join(" ")} } ?item wdt:P856 ?site; wdt:P154 ?logo. } LIMIT 1`;
    try {
        const response = await fetcher(
            `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
            {
                headers: { accept: "application/sparql-results+json", "user-agent": WIKIMEDIA_AGENT },
                signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
            }
        );
        if (!response.ok) {
            return { kind: "unknown" };
        }
        // SAFETY: only the one optional path below is read, and a missing value falls through to `missing`.
        const body = (await response.json()) as { results?: { bindings?: { logo?: { value?: string } }[] } };
        const file = body.results?.bindings?.[0]?.logo?.value;
        if (file === undefined) {
            return { kind: "missing" };
        }
        return await attempt(fetcher, `${file.replace("http://", "https://")}?width=256`, "wikidata", WIKIMEDIA_AGENT);
    } catch {
        return { kind: "unknown" };
    }
}

export async function findLogo(fetcher: Fetcher, domain: string): Promise<LookupResult> {
    const [fromGoogle, fromDuck] = await Promise.all([google(fetcher, domain), duckDuckGo(fetcher, domain)]);
    let attempts = [fromGoogle, fromDuck];
    const bestOf = () =>
        attempts.reduce<FoundLogo | null>((found, a) => (a.kind === "found" ? larger(found, a.logo) : found), null);

    if ((bestOf()?.size ?? 0) < SHARP_SIZE) {
        attempts = [...attempts, await ownSite(fetcher, domain)];
    }
    // Wikidata's logos are mostly wide wordmarks, which read worse in a square tile than a small icon.
    if (bestOf() === null) {
        attempts = [...attempts, await wikidata(fetcher, domain)];
    }
    const best = bestOf();
    if (best !== null) {
        return { kind: "found", logo: best };
    }
    return attempts.some((a) => a.kind === "unknown") ? { kind: "unknown" } : { kind: "missing" };
}
