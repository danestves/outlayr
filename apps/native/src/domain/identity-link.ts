import { websiteDomain } from "@/domain/merchant-website";

export type IdentityLink =
    | { kind: "unreadable" }
    | { kind: "refused"; platform: string }
    /** `image` is the whole link when it has a path, since it may point at a picture rather than a page. */
    | { kind: "website"; domain: string; image: string | null };

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const PATH_START = /[/?#]/;

const PLATFORMS: readonly (readonly [host: string, platform: string])[] = [
    ["instagram.com", "Instagram"],
    ["facebook.com", "Facebook"],
    ["fb.com", "Facebook"],
    ["fb.me", "Facebook"],
    ["tiktok.com", "TikTok"],
    ["linktr.ee", "Linktree"],
    ["wa.me", "WhatsApp"],
    ["whatsapp.com", "WhatsApp"],
    ["x.com", "X"],
    ["twitter.com", "X"],
    ["maps.app.goo.gl", "Google Maps"],
    ["maps.google.com", "Google Maps"],
];

const onHost = (domain: string, host: string) => domain === host || domain.endsWith(`.${host}`);

function pathOf(input: string): string {
    const rest = input.trim().replace(SCHEME, "");
    const start = rest.search(PATH_START);
    return start === -1 ? "" : rest.slice(start).toLowerCase();
}

/** A profile or map link names the platform's domain, so its logo would be the platform's, not the business's. */
export function readIdentityLink(input: string): IdentityLink {
    const domain = websiteDomain(input);
    if (domain === null) {
        return { kind: "unreadable" };
    }
    const platform = PLATFORMS.find(([host]) => onHost(domain, host))?.[1];
    if (platform !== undefined) {
        return { kind: "refused", platform };
    }
    if (onHost(domain, "google.com") && pathOf(input).startsWith("/maps")) {
        return { kind: "refused", platform: "Google Maps" };
    }
    const trimmed = input.trim();
    const path = pathOf(trimmed);
    if (path.length === 0 || path === "/") {
        return { domain, image: null, kind: "website" };
    }
    return { domain, image: SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`, kind: "website" };
}
