/**
 * Holds unsaved drafts per key for the Undo that reopens a sheet swiped away with edits. Taking a draft removes
 * it, so it restores once and a later, ordinary open starts clean.
 */
export function createDraftStash<Draft>() {
    const drafts = new Map<string, Draft>();
    return {
        put(key: string, draft: Draft) {
            drafts.set(key, draft);
        },
        take(key: string): Draft | undefined {
            const draft = drafts.get(key);
            drafts.delete(key);
            return draft;
        },
    };
}
