import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export const PROFILE_COOKIE = "outlayr-profile";
export const PERSONAL_PROFILE_KEY = "personal";

declare global {
    interface Window {
        __OUTLAYR_PROFILE__?: string | null;
    }
}

export function parseProfileId(stored: string | null | undefined): string | null {
    const trimmed = stored?.trim();
    return trimmed !== undefined && PROFILE_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export const profileKeyOf = (profileId: string | null) => profileId ?? PERSONAL_PROFILE_KEY;

export const profileArgs = (profileId: string | null): { profileId?: string } =>
    profileId === null ? {} : { profileId };

export const profileScript = (profileId: string | null) => `window.__OUTLAYR_PROFILE__=${JSON.stringify(profileId)}`;

const fromWindow = () => {
    if (typeof window === "undefined") {
        return null;
    }
    return parseProfileId(window.__OUTLAYR_PROFILE__);
};

export const currentProfileId = createIsomorphicFn()
    .server(() => parseProfileId(getCookie(PROFILE_COOKIE)))
    .client(fromWindow);

export const browserProfileId = fromWindow;

export function scopedStorageKey(base: string, profileId = browserProfileId()) {
    const key = profileKeyOf(profileId);
    return key === PERSONAL_PROFILE_KEY ? base : `${base}:${key}`;
}
