/** 1-indexed; reaching the limit exactly counts as running out. */
export function crossingDay(cumulative: readonly number[], limit: number): number | null {
    for (let index = 0; index < cumulative.length; index += 1) {
        if (cumulative[index] >= limit) {
            return index + 1;
        }
    }
    return null;
}
