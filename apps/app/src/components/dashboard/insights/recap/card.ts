export const CARD_SIZES = {
    "4:5": [1080, 1350],
    "1:1": [1080, 1080],
    "9:16": [1080, 1920],
} as const;

export type CardSize = keyof typeof CARD_SIZES;

export const SIZE_NAMES = Object.keys(CARD_SIZES).filter((name): name is CardSize => name in CARD_SIZES);

export interface CardCategory {
    amount: string | null;
    color: string;
    fraction: number;
    name: string;
    percent: string;
}

export interface CardInput {
    categories: CardCategory[];
    daysLine: string;
    headline: string;
    monthLabel: string;
    total: string | null;
    url: string;
}

const PALETTE = {
    background: "#1b1812",
    border: "#322d23",
    foreground: "#f5f1e8",
    muted: "#a39d8f",
    tint: "#e2643f",
    track: "#2a251c",
};
const PAD = 72;
const RADIUS = 56;
const HEADLINE_SIZE = 96;
const HEADLINE_LEADING = 108;
const ROW_HEIGHT = 92;
const BAR_HEIGHT = 24;
const GAP = 2;
const LOGO_SIZE = 64;
const SANS = "Geist, ui-sans-serif, system-ui, sans-serif";
const MONO = '"Geist Mono", ui-monospace, monospace';

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
        const next = line === "" ? word : `${line} ${word}`;
        if (line !== "" && context.measureText(next).width > width) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    return line === "" ? lines : [...lines, line];
}

function loadImage(source: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", () => reject(new Error("The logo did not load")));
        image.src = source;
    });
}

/** The recap as a PNG: the month, one headline, the split by category and where it came from. */
export async function renderCard(input: CardInput, size: CardSize, logo: string | null): Promise<Blob> {
    const [width, height] = CARD_SIZES[size];
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("A canvas is not available here");
    }
    await document.fonts.ready;
    context.fillStyle = PALETTE.background;
    context.beginPath();
    context.roundRect(0, 0, width, height, RADIUS);
    context.fill();
    context.strokeStyle = PALETTE.border;
    context.lineWidth = 2;
    context.stroke();

    context.textBaseline = "alphabetic";
    context.fillStyle = PALETTE.foreground;
    context.font = `500 42px ${SANS}`;
    context.fillText(input.monthLabel, PAD, PAD + 40);
    if (logo !== null) {
        const mark = await loadImage(logo);
        context.drawImage(mark, width - PAD - LOGO_SIZE, PAD - 6, LOGO_SIZE, LOGO_SIZE);
    }

    context.font = `600 ${HEADLINE_SIZE}px ${SANS}`;
    const headline = wrap(context, input.headline, width - PAD * 2);
    let y = PAD + 150 + HEADLINE_SIZE;
    for (const line of headline) {
        context.fillText(line, PAD, y);
        y += HEADLINE_LEADING;
    }
    if (input.total !== null) {
        context.fillStyle = PALETTE.tint;
        context.font = `600 56px ${MONO}`;
        context.fillText(input.total, PAD, y);
        y += 70;
    }
    context.fillStyle = PALETTE.muted;
    context.font = `400 40px ${SANS}`;
    context.fillText(input.daysLine, PAD, y);
    y += 90;

    const barWidth = width - PAD * 2;
    context.fillStyle = PALETTE.track;
    context.beginPath();
    context.roundRect(PAD, y, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    context.fill();
    let x = PAD;
    context.save();
    context.beginPath();
    context.roundRect(PAD, y, barWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    context.clip();
    for (const category of input.categories) {
        const part = category.fraction * barWidth;
        context.fillStyle = category.color;
        context.fillRect(x, y, Math.max(part - GAP, 1), BAR_HEIGHT);
        x += part;
    }
    context.restore();
    y += BAR_HEIGHT + 56;

    const room = Math.floor((height - PAD * 2 - 60 - y + 56) / ROW_HEIGHT);
    for (const category of input.categories.slice(0, Math.max(room, 1))) {
        context.fillStyle = category.color;
        context.beginPath();
        context.roundRect(PAD + 4, y - 26, 26, 26, 7);
        context.fill();
        context.fillStyle = PALETTE.foreground;
        context.font = `500 46px ${SANS}`;
        context.fillText(category.name, PAD + 64, y);
        context.textAlign = "right";
        context.font = `500 42px ${MONO}`;
        context.fillText(category.amount ?? category.percent, width - PAD, y);
        context.textAlign = "left";
        y += ROW_HEIGHT;
    }

    context.fillStyle = PALETTE.muted;
    context.font = `400 38px ${MONO}`;
    context.fillText(input.url, PAD, height - PAD);

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The card could not be made"))), "image/png");
    });
}

/** The logo markup as an image source in the tint. */
export function logoSource(markup: string) {
    const tinted = markup
        .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
        .replaceAll("currentColor", PALETTE.tint);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinted)}`;
}
