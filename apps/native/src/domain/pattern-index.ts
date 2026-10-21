// Longest pattern first, so "bbva provincial" is reached before the shorter "bbva" it contains.
export function buildPatternIndex<T extends { readonly patterns: readonly string[] }>(
    entries: readonly T[]
): ReadonlyMap<string, T> {
    const ranked = entries.flatMap((entry) =>
        entry.patterns.map((pattern) => ({ entry, pattern, tokenCount: pattern.split(" ").length }))
    );
    ranked.sort((a, b) => {
        const tokenDiff = b.tokenCount - a.tokenCount;
        return tokenDiff === 0 ? b.pattern.length - a.pattern.length : tokenDiff;
    });
    return new Map(ranked.map(({ pattern, entry }) => [pattern, entry]));
}

export function containsTokenSequence(haystack: readonly string[], needle: readonly string[]): boolean {
    return needle.length > 0 && ` ${haystack.join(" ")} `.includes(` ${needle.join(" ")} `);
}
