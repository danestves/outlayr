export interface PageRanges {
    readonly shown: string;
    readonly hidden: number;
}

export function pageRanges(pages: readonly number[], maxRanges = 3): PageRanges {
    const ranges: [first: number, last: number][] = [];
    for (const page of pages) {
        const last = ranges.at(-1);
        if (last !== undefined && page === last[1] + 1) {
            last[1] = page;
        } else {
            ranges.push([page, page]);
        }
    }
    const kept = ranges.slice(0, maxRanges);
    const hidden = ranges.slice(maxRanges).reduce((total, [first, last]) => total + last - first + 1, 0);
    const shown = kept.map(([first, last]) => (first === last ? String(first) : `${first}-${last}`)).join(", ");
    return { hidden, shown };
}
