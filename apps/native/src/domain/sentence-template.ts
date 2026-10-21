const PLACEHOLDER = /\{(\w+)\}/g;
const WHITESPACE = /(\s+)/;

interface SentenceAtom {
    readonly kind: "slot" | "text";
    readonly value: string;
}

// Atoms written with no whitespace between them stay on one line, so a full stop or Spanish `¿` never wraps away.
export interface SentenceCluster {
    readonly atoms: readonly SentenceAtom[];
}

// `@/i18n/translate`'s placeholder syntax, so word order stays the translator's to change.
export function parseSentence(template: string): readonly SentenceCluster[] {
    const clusters: SentenceAtom[][] = [];
    let current: SentenceAtom[] = [];

    const breakCluster = () => {
        if (current.length > 0) {
            clusters.push(current);
            current = [];
        }
    };

    const pushText = (text: string) => {
        for (const piece of text.split(WHITESPACE)) {
            if (piece === "") {
                continue;
            }
            if (piece.trim() === "") {
                breakCluster();
                continue;
            }
            current.push({ kind: "text", value: piece });
        }
    };

    let cursor = 0;
    for (const match of template.matchAll(PLACEHOLDER)) {
        pushText(template.slice(cursor, match.index));
        current.push({ kind: "slot", value: match[1] });
        cursor = match.index + match[0].length;
    }
    pushText(template.slice(cursor));
    breakCluster();

    return clusters.map((atoms) => ({ atoms }));
}

export function sentenceSlotNames(template: string): readonly string[] {
    return [...template.matchAll(PLACEHOLDER)].map((match) => match[1]);
}
