import { merchantKey } from "./merchant-resolver";

export interface HistoricalEntry {
    categoryId: string;
    date: number;
    note: string;
}

// The count decides, not the latest row: a single miscategorised entry is exactly when the latest answer is wrong.
export function rememberedCategory(entries: readonly HistoricalEntry[], key: string): string | null {
    if (key === "") {
        return null;
    }

    const counts = new Map<string, { count: number; latest: number }>();
    for (const entry of entries) {
        if (merchantKey(entry.note) !== key) {
            continue;
        }
        const tally = counts.get(entry.categoryId);
        if (tally == null) {
            counts.set(entry.categoryId, { count: 1, latest: entry.date });
            continue;
        }
        tally.count += 1;
        tally.latest = Math.max(tally.latest, entry.date);
    }

    let bestId: string | null = null;
    let best = { count: 0, latest: 0 };
    for (const [categoryId, tally] of counts) {
        if (tally.count > best.count || (tally.count === best.count && tally.latest > best.latest)) {
            bestId = categoryId;
            best = tally;
        }
    }
    return bestId;
}
