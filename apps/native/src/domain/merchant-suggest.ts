import { MERCHANTS } from "./merchant-map";
import { merchantKey } from "./merchant-resolver";

const MIN_QUERY_LENGTH = 2;

interface Ranked {
    label: string;
    length: number;
}

export function suggestMerchants(query: string, limit: number, exclude: readonly string[] = []): string[] {
    const key = merchantKey(query);
    if (key.length < MIN_QUERY_LENGTH) {
        return [];
    }
    const skip = new Set(exclude.map((name) => merchantKey(name)));
    const ranked: Ranked[] = [];
    for (const entry of MERCHANTS) {
        const [canonical] = entry.patterns;
        if (canonical === undefined || skip.has(canonical)) {
            continue;
        }
        if (!entry.patterns.some((pattern) => pattern.startsWith(key))) {
            continue;
        }
        ranked.push({ label: entry.label, length: canonical.length });
    }
    ranked.sort((a, b) => a.length - b.length);
    return ranked.slice(0, limit).map((entry) => entry.label);
}
