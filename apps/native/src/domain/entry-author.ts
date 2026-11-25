/** First names by account id, as the profile's member list reports them. */
export type MemberNames = ReadonlyMap<string, string | null>;

/**
 * An entry with no `createdBy` predates the server stamp, so the ledger's owner logged it.
 * A row still queued in the outbox has no stamp yet, so it says nothing.
 * Returns nothing for the viewer's own entries and for ids the member list does not know.
 */
export function entryAuthor(
    createdBy: string | null,
    unsent: boolean,
    ownerId: string | null,
    myAccountId: string | null,
    names: MemberNames
): string | null {
    if (createdBy === null && unsent) {
        return null;
    }
    const logger = createdBy ?? ownerId;
    if (logger === null || logger === myAccountId) {
        return null;
    }
    const name = names.get(logger);
    return name || null;
}
