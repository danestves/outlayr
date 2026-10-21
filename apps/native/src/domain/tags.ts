export const TAG_NAME_LIMIT = 24;

export function normalizeTagName(raw: string): string {
    return raw.trim().replaceAll(/\s+/g, " ").slice(0, TAG_NAME_LIMIT);
}

export function tagKey(name: string): string {
    return normalizeTagName(name).toLocaleLowerCase();
}

export function isUsableTagName(raw: string): boolean {
    return normalizeTagName(raw).length > 0;
}

export interface NamedTag {
    id: string;
    name: string;
}

export function findTagByName<T extends NamedTag>(tags: readonly T[], name: string): T | null {
    const key = tagKey(name);
    return tags.find((tag) => tagKey(tag.name) === key) ?? null;
}

export function sortTags<T extends NamedTag>(tags: readonly T[]): T[] {
    return [...tags].sort((a, b) => tagKey(a.name).localeCompare(tagKey(b.name)));
}

export interface TagLinkDiff {
    attach: string[];
    detach: string[];
}

// A diff, not delete-and-reinsert: every write replicates, and a tombstone-then-recreate briefly untags the entry on
// other devices.
export function tagLinkDiff(current: readonly string[], next: readonly string[]): TagLinkDiff {
    const before = new Set(current);
    const after = new Set(next);
    return {
        attach: [...after].filter((id) => !before.has(id)),
        detach: [...before].filter((id) => !after.has(id)),
    };
}
