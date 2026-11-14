import { websiteDomain } from "@/domain/merchant-website";

export type IdentityLink =
    | { kind: "unreadable" }
    | { kind: "refused"; platform: string }
    | { kind: "website"; domain: string };

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
    return { domain, kind: "website" };
}
