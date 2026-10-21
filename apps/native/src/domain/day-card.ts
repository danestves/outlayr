/** Day-card geometry, kept apart from the Skia painter so it can be tested without a GPU. Points at 1x. */

export const DAY_CARD_WIDTH = 360;

const PADDING = 24;
const LABEL_SIZE = 11;
const TOTAL_SIZE = 34;
const NOTE_SIZE = 15;
const META_SIZE = 11;
const SIGNATURE_SIZE = 10;
const ROW_HEIGHT = 34;
const RULE_HEIGHT = 1.3;

/** Estimated from the em size (no Skia surface here); erring wide clips early rather than overlapping. */
const AVERAGE_GLYPH = 0.55;

export type CardWeight = "mono" | "regular" | "medium" | "semibold";
export type CardTone = "ink" | "muted";

interface CardText {
    align: "left" | "right";
    size: number;
    text: string;
    tone: CardTone;
    weight: CardWeight;
    x: number;
    /** Baseline, not the top of the box. */
    y: number;
}

interface CardRule {
    height: number;
    width: number;
    x: number;
    y: number;
}

interface DayCardRow {
    amount: string;
    meta: string;
    note: string;
}

export interface DayCardInput {
    dayLabel: string;
    rows: readonly DayCardRow[];
    total: string;
}

export interface DayCardLayout {
    height: number;
    rules: CardRule[];
    texts: CardText[];
    width: number;
}

export function truncateToWidth(text: string, size: number, maxWidth: number): string {
    const budget = Math.floor(maxWidth / (size * AVERAGE_GLYPH));
    if (budget >= text.length) {
        return text;
    }
    if (budget < 1) {
        return "…";
    }
    return `${text.slice(0, budget - 1).trimEnd()}…`;
}

export function layoutDayCard(input: DayCardInput): DayCardLayout {
    const texts: CardText[] = [];
    const rules: CardRule[] = [];
    const left = PADDING;
    const right = DAY_CARD_WIDTH - PADDING;
    const contentWidth = right - left;

    let y = PADDING + LABEL_SIZE;
    texts.push({
        align: "left",
        size: LABEL_SIZE,
        text: input.dayLabel,
        tone: "muted",
        weight: "mono",
        x: left,
        y,
    });

    y += TOTAL_SIZE + 6;
    texts.push({
        align: "left",
        size: TOTAL_SIZE,
        text: input.total,
        tone: "ink",
        weight: "semibold",
        x: left,
        y,
    });

    y += 18;
    rules.push({ height: RULE_HEIGHT, width: contentWidth, x: left, y });

    const amountWidth = contentWidth * 0.36;
    const noteWidth = contentWidth - amountWidth - 12;

    for (const row of input.rows) {
        y += ROW_HEIGHT;
        texts.push(
            {
                align: "left",
                size: NOTE_SIZE,
                text: truncateToWidth(row.note, NOTE_SIZE, noteWidth),
                tone: "ink",
                weight: "medium",
                x: left,
                y,
            },
            {
                align: "right",
                size: NOTE_SIZE,
                text: row.amount,
                tone: "ink",
                weight: "medium",
                x: right,
                y,
            }
        );
        if (row.meta !== "") {
            y += META_SIZE + 3;
            texts.push({
                align: "left",
                size: META_SIZE,
                text: truncateToWidth(row.meta, META_SIZE, noteWidth),
                tone: "muted",
                weight: "regular",
                x: left,
                y,
            });
        }
    }

    y += 22;
    rules.push({ height: RULE_HEIGHT, width: contentWidth, x: left, y });

    y += SIGNATURE_SIZE + 14;
    texts.push({
        align: "left",
        size: SIGNATURE_SIZE,
        text: "OUTLAYR",
        tone: "muted",
        weight: "mono",
        x: left,
        y,
    });

    return {
        height: y + PADDING,
        rules,
        texts,
        width: DAY_CARD_WIDTH,
    };
}
