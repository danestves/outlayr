const DATE_STRING_LENGTH = 10;

// UTC, so both rate fetchers agree across local-midnight boundaries.
export function utcDateString(epochMs: number): string {
    return new Date(epochMs).toISOString().slice(0, DATE_STRING_LENGTH);
}
