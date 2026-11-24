/** Mirrors `PROFILE_MEMBER_LIMIT` in `packages/backend/confect/profileSharing.ts`: members besides the owner. */
export const PROFILE_SEAT_LIMIT = 5;

const SITE_URL = "https://tryoutlayr.com";

export function profileInviteLink(code: string): string {
    return `${SITE_URL}/join/${code.toLowerCase()}`;
}

export function profileInviteDeepLink(code: string): string {
    return `outlayr://join/${code.toLowerCase()}`;
}
