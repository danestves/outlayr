export type TakeField = "account" | "amount" | "category" | "merchant" | "when";

export interface TakeSegment {
    readonly field: TakeField | null;
    readonly text: string;
}

export interface Take {
    readonly heard: string;
    readonly segments: readonly TakeSegment[];
    readonly spokenAt: Readonly<Partial<Record<TakeField, number>>>;
    readonly words: readonly string[];
}

const MARK = /\{(account|amount|category|merchant|when)\|([^}]+)\}/g;
const SPACE = /\s+/;

const isField = (name: string | undefined): name is TakeField =>
    name === "account" || name === "amount" || name === "category" || name === "merchant" || name === "when";

export function parseTake(template: string): Take {
    const segments: TakeSegment[] = [];
    let cursor = 0;
    for (const match of template.matchAll(MARK)) {
        if (match.index > cursor) {
            segments.push({ field: null, text: template.slice(cursor, match.index) });
        }
        const [, field, text = ""] = match;
        segments.push({ field: isField(field) ? field : null, text });
        cursor = match.index + match[0].length;
    }
    if (cursor < template.length) {
        segments.push({ field: null, text: template.slice(cursor) });
    }
    const heard = segments.map((segment) => segment.text).join("");
    const spokenAt: Partial<Record<TakeField, number>> = {};
    let spoken = "";
    for (const segment of segments) {
        spoken += segment.text;
        if (segment.field !== null) {
            spokenAt[segment.field] = spoken.trim().split(SPACE).length;
        }
    }
    return { heard, segments, spokenAt, words: heard.trim().split(SPACE) };
}

export function heardBy(take: Take, field: TakeField, words: number): boolean {
    const at = take.spokenAt[field];
    return at !== undefined && at <= words;
}
