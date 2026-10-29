import { DAY_CARD_WIDTH, truncateToWidth } from "./day-card";
import type { CardBar, DayCardLayout } from "./day-card";

const PADDING = 24;
const LABEL_SIZE = 11;
const HEADLINE_SIZE = 24;
const HEADLINE_LEADING = 29;
const TOTAL_SIZE = 34;
const ROW_SIZE = 15;
const BAR_HEIGHT = 6;
const ROW_HEIGHT = 40;
const FOOT_SIZE = 11;
const RULE_HEIGHT = 1.3;
const AVERAGE_GLYPH = 0.55;

export interface RecapCardCategory {
    amount: string | null;
    color: string;
    fraction: number;
    name: string;
    percent: string;
}

export interface RecapCardInput {
    categories: readonly RecapCardCategory[];
    daysLine: string;
    headline: string;
    monthLabel: string;
    total: string | null;
    url: string;
}

type CardText = DayCardLayout["texts"][number];

function wrap(text: string, size: number, maxWidth: number): string[] {
    const budget = Math.floor(maxWidth / (size * AVERAGE_GLYPH));
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
        const next = line === "" ? word : `${line} ${word}`;
        if (next.length > budget && line !== "") {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    return line === "" ? lines : [...lines, line];
}

export function layoutRecapCard(input: RecapCardInput): Required<DayCardLayout> {
    const texts: CardText[] = [];
    const rules: DayCardLayout["rules"] = [];
    const bars: CardBar[] = [];
    const left = PADDING;
    const right = DAY_CARD_WIDTH - PADDING;
    const contentWidth = right - left;

    let y = PADDING + LABEL_SIZE;
    texts.push({ align: "left", size: LABEL_SIZE, text: input.monthLabel, tone: "muted", weight: "mono", x: left, y });

    y += 14;
    for (const line of wrap(input.headline, HEADLINE_SIZE, contentWidth)) {
        y += HEADLINE_LEADING;
        texts.push({ align: "left", size: HEADLINE_SIZE, text: line, tone: "ink", weight: "semibold", x: left, y });
    }

    if (input.total !== null) {
        y += TOTAL_SIZE + 8;
        texts.push({ align: "left", size: TOTAL_SIZE, text: input.total, tone: "ink", weight: "semibold", x: left, y });
    }

    y += 20;
    rules.push({ height: RULE_HEIGHT, width: contentWidth, x: left, y });

    const figuresWidth = contentWidth * 0.4;
    for (const category of input.categories) {
        y += ROW_HEIGHT - BAR_HEIGHT - 8;
        texts.push(
            {
                align: "left",
                size: ROW_SIZE,
                text: truncateToWidth(category.name, ROW_SIZE, contentWidth - figuresWidth - 12),
                tone: "ink",
                weight: "medium",
                x: left,
                y,
            },
            {
                align: "right",
                size: ROW_SIZE,
                text: category.amount === null ? category.percent : `${category.amount}  ${category.percent}`,
                tone: "ink",
                weight: "medium",
                x: right,
                y,
            }
        );
        y += 8;
        bars.push({
            color: category.color,
            fraction: Math.min(1, Math.max(0, category.fraction)),
            height: BAR_HEIGHT,
            width: contentWidth,
            x: left,
            y,
        });
        y += BAR_HEIGHT;
    }

    y += 22;
    rules.push({ height: RULE_HEIGHT, width: contentWidth, x: left, y });

    y += FOOT_SIZE + 14;
    texts.push(
        { align: "left", size: FOOT_SIZE, text: input.daysLine, tone: "muted", weight: "regular", x: left, y },
        { align: "right", size: FOOT_SIZE, text: input.url, tone: "muted", weight: "mono", x: right, y }
    );

    return { bars, height: y + PADDING, rules, texts, width: DAY_CARD_WIDTH };
}
