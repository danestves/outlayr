import { merchantLogoUrl } from "@outlayr/backend/confect/lib/photoKeys";

// A merchant logo is public; any other photo goes through /photos, which the files Worker answers for the session.
export const photoSrc = (key: string | null | undefined) =>
    key ? (merchantLogoUrl(key) ?? `/photos/${key}`) : undefined;
