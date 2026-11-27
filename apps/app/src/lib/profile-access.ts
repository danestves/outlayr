export type ProfileAccess = "joined" | "none" | "own" | "unknown";

export const profileAccess = (
    requested: string | null,
    own: boolean,
    joined: readonly { profileId: string }[]
): ProfileAccess => {
    if (requested === null) {
        return "none";
    }
    if (own) {
        return "own";
    }
    return joined.some((row) => row.profileId === requested) ? "joined" : "unknown";
};
