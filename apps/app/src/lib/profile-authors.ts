export const UNSENT_SEQ = Number.MAX_SAFE_INTEGER;
export const FORMER_AUTHORS = "former-authors";
export const authorId = (
    createdBy: string | null | undefined,
    unsent: boolean,
    ownerId: string | null,
    viewerId: string | null
): string | null => createdBy ?? (unsent ? viewerId : ownerId);

export const unsentOf = (row: { seq: number }) => row.seq === UNSENT_SEQ;

export const authorBucket = (id: string | null, members: ReadonlySet<string>): string | null => {
    if (id === null) {
        return null;
    }
    return members.has(id) ? id : FORMER_AUTHORS;
};

export const authorIdOf = (
    row: { createdBy?: string | null; seq: number } | null | undefined,
    ownerId: string | null,
    viewerId: string | null
) => (row ? authorId(row.createdBy, unsentOf(row), ownerId, viewerId) : authorId(null, false, ownerId, viewerId));

export const memberNames = (
    members: readonly { id: string; name: string | null }[],
    fallback: string
): ReadonlyMap<string, string> => new Map(members.map((member) => [member.id, member.name ?? fallback]));
