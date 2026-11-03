const PROFILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const PERSONAL_DATABASE = "outlayr.db";

export function parseProfileId(stored: string | null): string | undefined {
    const trimmed = stored?.trim();
    return trimmed !== undefined && PROFILE_ID_PATTERN.test(trimmed) ? trimmed : undefined;
}

export function databaseNameFor(profileId: string | undefined): string {
    return profileId === undefined ? PERSONAL_DATABASE : `outlayr-${profileId}.db`;
}

export function profileArgs(profileId: string | undefined): { profileId?: string } {
    return profileId === undefined ? {} : { profileId };
}
