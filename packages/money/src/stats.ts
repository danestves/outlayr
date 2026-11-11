// Null on an empty series, so callers decide what "no evidence" means instead of inheriting a zero.
export function median(values: readonly number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const upper = sorted[mid] ?? 0;
    return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? upper) + upper) / 2 : upper;
}
