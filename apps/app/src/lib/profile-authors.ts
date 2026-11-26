export const UNSENT_SEQ = Number.MAX_SAFE_INTEGER;
export const authorId = (
    createdBy: string | null | undefined,
    unsent: boolean,
    ownerId: string | null,
    viewerId: string | null
): string | null => createdBy ?? (unsent ? viewerId : ownerId);

export const unsentOf = (row: { seq: number }) => row.seq === UNSENT_SEQ;

export const authorIdOf = (
    row: { createdBy?: string | null; seq: number } | null | undefined,
    ownerId: string | null,
    viewerId: string | null
) => (row ? authorId(row.createdBy, unsentOf(row), ownerId, viewerId) : authorId(null, false, ownerId, viewerId));
