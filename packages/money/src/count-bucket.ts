const BUCKETS = [
    [1000, "1000+"],
    [100, "100-999"],
    [10, "10-99"],
    [1, "1-9"],
] as const;

export function countBucket(count: number) {
    return BUCKETS.find(([floor]) => count >= floor)?.[1] ?? "0";
}
