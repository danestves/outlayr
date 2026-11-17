import { merchantLogoUrl } from "@outlayr/backend/confect/lib/photoKeys";

// A merchant logo is public; the visitor's own photo goes through /photos, which signs it for their session.
export const photoSrc = (key: string | null | undefined) =>
    key ? (merchantLogoUrl(key) ?? `/photos/${key}`) : undefined;
