export const acceptedProfileId = (requested: string | null, own: boolean, joined: readonly { profileId: string }[]) => {
    if (requested === null) {
        return null;
    }
    return own || joined.some((row) => row.profileId === requested) ? requested : null;
};
