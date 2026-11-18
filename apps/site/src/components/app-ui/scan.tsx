import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import { getIntlayer } from "intlayer";
import type { CSSProperties, ReactNode } from "react";

import { AppScreen, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { ButtonPair, CaptureButton, frameAttrs, frameTimes, MODAL, ModalBackdrop, ModalBody } from "./capture-parts";
import type { FrameStyle } from "./capture-parts";
import { formatDayTitle } from "./dates";
import { CATEGORY_KEYS } from "./entry-state";
import { DEMO_NOW } from "./ledger";
import { currencyFor, formatAmount, formatFixed } from "./money";
import { ORB_DOTS, ORB_SIZE } from "./scan-orb";
import { appTranslator, interpolate } from "./strings";
import { fontAscent, roundedTrak, textLineHeight } from "./type";
import { StatusLine } from "./voice";

export type ScanStep = "intro" | "reading" | "review";

const FRAME = { height: 268, width: 220 } as const;
const PAPER = { inset: 22, radius: 6, toothHeight: 6, toothWidth: 10 } as const;
const BRACKET = { arm: 26, radius: 14, stroke: 2.5 } as const;
const SKETCH = { gap: 13, height: 5, inset: 16 } as const;
const STAGE = { height: 389, radius: 20, width: 292 } as const;
const THUMB = { height: 96, radius: 12, width: 72 } as const;
const MARK = { radius: 7, size: 24, zoom: 1.42 } as const;
const SWEEP = { band: 0.26, glow: 6, line: 1.5, still: 0.33 } as const;
const PHOTO = { height: 400, width: 300 } as const;
const MERCHANT = "Costco";
const LOGO = "costco.com";
const ITEMS = [8.99, 11.49, 21.52] as const;
const TOTAL = 42;
const HERO = { line: 44, size: 40 } as const;
const onPixel = (value: number) => Math.round(value * 3) / 3;
const HERO_RISE =
    (HERO.line + 2 * fontAscent(HERO.size) - textLineHeight(HERO.size)) / 2 - onPixel(fontAscent(HERO.size));
const BASE: FrameStyle = { "--app-trak": roundedTrak(16) };

const alpha = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount * 100}%, transparent)`;

function paperPath() {
    const left = PAPER.inset;
    const right = FRAME.width - PAPER.inset;
    const top = PAPER.inset;
    const bottom = FRAME.height - PAPER.inset;
    const teeth = Math.max(1, Math.floor((right - left) / PAPER.toothWidth));
    const tooth = (right - left) / teeth;
    const zigzag = Array.from(
        { length: teeth },
        (_, index) =>
            `L${right - tooth * (index + 0.5)} ${bottom} L${right - tooth * (index + 1)} ${bottom - PAPER.toothHeight}`
    ).join(" ");
    return [
        `M${left} ${top + PAPER.radius}`,
        `Q${left} ${top} ${left + PAPER.radius} ${top}`,
        `L${right - PAPER.radius} ${top}`,
        `Q${right} ${top} ${right} ${top + PAPER.radius}`,
        `L${right} ${bottom - PAPER.toothHeight}`,
        zigzag,
        "Z",
    ].join(" ");
}

function bracketsPath() {
    const inset = BRACKET.stroke / 2;
    const corners = [
        { sx: 1, sy: 1, x: inset, y: inset },
        { sx: -1, sy: 1, x: FRAME.width - inset, y: inset },
        { sx: 1, sy: -1, x: inset, y: FRAME.height - inset },
        { sx: -1, sy: -1, x: FRAME.width - inset, y: FRAME.height - inset },
    ];
    return corners
        .map(
            ({ sx, sy, x, y }) =>
                `M${x} ${y + sy * BRACKET.arm} L${x} ${y + sy * BRACKET.radius} Q${x} ${y} ${x + sx * BRACKET.radius} ${y} L${x + sx * BRACKET.arm} ${y}`
        )
        .join(" ");
}

const SKETCH_LEFT = PAPER.inset + SKETCH.inset;
const SKETCH_WIDTH = FRAME.width - SKETCH_LEFT * 2;
const SKETCH_LINES = [
    { w: 0.55, x: 0.225 },
    { w: 0.36, x: 0.32 },
    { w: 0, x: 0 },
    { w: 1, x: 0 },
    { w: 0.86, x: 0 },
    { w: 0.92, x: 0 },
    { w: 0.7, x: 0 },
    { w: 0, x: 0 },
    { w: 0.5, x: 0.5 },
] as const;

export function ReceiptFrame() {
    const paper = paperPath();
    const firstLine = PAPER.inset + SKETCH.inset + 4;
    const lastIndex = SKETCH_LINES.length - 1;
    return (
        <svg height={FRAME.height} viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} width={FRAME.width}>
            <path d={paper} fill="var(--surface)" />
            <path
                d={paper}
                fill="none"
                stroke={alpha("var(--foreground)", 0.22)}
                strokeDasharray="4 4"
                strokeWidth={1}
            />
            {SKETCH_LINES.map((line, index) =>
                line.w === 0 ? null : (
                    <rect
                        fill={alpha("var(--foreground)", index === lastIndex ? 0.55 : 0.18)}
                        height={index === lastIndex ? SKETCH.height + 2 : SKETCH.height}
                        key={index}
                        rx={SKETCH.height / 2}
                        width={SKETCH_WIDTH * line.w}
                        x={SKETCH_LEFT + SKETCH_WIDTH * line.x}
                        y={firstLine + index * SKETCH.gap}
                    />
                )
            )}
            <path
                d={bracketsPath()}
                fill="none"
                stroke="var(--tint)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={BRACKET.stroke}
            />
        </svg>
    );
}

const PRINT: CSSProperties = {
    color: "#2b2723",
    fontFamily: '"Courier Prime", "Courier New", Courier, "Nimbus Mono PS", "Liberation Mono", monospace',
    fontSize: 9.6,
    letterSpacing: 0.2,
    lineHeight: "16.8px",
    whiteSpace: "pre",
};
const PRINT_HEAD: CSSProperties = { ...PRINT, fontSize: 19.5, fontWeight: 700, letterSpacing: 2, lineHeight: "26px" };
const PRINT_BOLD: CSSProperties = { ...PRINT, fontWeight: 700 };
const RULE: CSSProperties = {
    background: "repeating-linear-gradient(90deg, #3a3530 0 4px, transparent 4px 6.4px)",
    height: 1.2,
    marginBlock: 7,
    opacity: 0.75,
};
const TEETH = { count: 16, depth: 4 } as const;
const PAPER_EDGE = Array.from({ length: TEETH.count }, (_, index) => {
    const step = 100 / TEETH.count;
    return `${100 - step * (index + 0.5)}% 100%, ${100 - step * (index + 1)}% calc(100% - ${TEETH.depth}px)`;
}).join(", ");

function PrintRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
    const style = strong ? PRINT_BOLD : PRINT;
    return (
        <div className="flex-row justify-between">
            <span style={style}>{label}</span>
            <span style={style}>{value}</span>
        </div>
    );
}

export function ReceiptPhoto({ height, width }: { height: number; width: number }) {
    const { locale } = useReplica();
    const { labels } = getIntlayer("appUi", locale);
    const scale = Math.max(width / PHOTO.width, height / PHOTO.height);
    return (
        <div className="overflow-hidden" style={{ height, width }}>
            <div
                className="absolute"
                style={{
                    background: "radial-gradient(110% 85% at 42% 38%, #d8d3cb 0%, #cdc7be 60%, #bdb6ab 100%), #cbc5bb",
                    height: PHOTO.height,
                    left: (width - PHOTO.width * scale) / 2,
                    top: (height - PHOTO.height * scale) / 2,
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                    width: PHOTO.width,
                }}
            >
                <div
                    className="absolute"
                    style={{
                        filter: "drop-shadow(0 5px 7px rgb(60 48 36 / 0.22))",
                        left: 59,
                        top: 90,
                        transform: "rotate(-1.9deg)",
                        width: 181,
                    }}
                >
                    <div
                        style={{
                            background: "linear-gradient(180deg, #fdfcf9 0%, #f6f4ef 100%)",
                            borderTopLeftRadius: 1.5,
                            borderTopRightRadius: 1.5,
                            clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${TEETH.depth}px), ${PAPER_EDGE})`,
                            paddingBottom: 37,
                            paddingInline: 15,
                            paddingTop: 12,
                        }}
                    >
                        <div className="items-center">
                            <span style={PRINT_HEAD}>COSTCO</span>
                        </div>
                        <div style={RULE} />
                        {labels.receiptLines.map((line, index) => (
                            <PrintRow key={line} label={line} value={formatFixed(ITEMS[index] ?? 0, 2, locale)} />
                        ))}
                        <div style={RULE} />
                        <PrintRow label={labels.receiptTotal} strong value={formatFixed(TOTAL, 2, locale)} />
                        <PrintRow label={labels.receiptDebit} value="****4417" />
                        <PrintRow label={labels.receiptDate} value="14:32" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ScanSweep({ style }: { style?: FrameStyle }) {
    const band = Math.max(24, STAGE.height * SWEEP.band);
    const travel = STAGE.height - band;
    const line = (band - SWEEP.line) / 2;
    const glow = alpha("var(--tint)", 0.95);
    return (
        <div
            className="absolute inset-x-0 top-0"
            data-sweep=""
            style={{
                height: band,
                transform: `translateY(${travel * SWEEP.still}px)`,
                ...style,
                "--travel": `${travel}px`,
            }}
        >
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(180deg, ${alpha("var(--tint)", 0)} 0%, ${alpha("var(--tint)", 0.42)} 50%, ${alpha("var(--tint)", 0)} 100%)`,
                }}
            />
            <div
                className="absolute inset-x-0"
                style={{
                    background: glow,
                    boxShadow: `0 0 ${SWEEP.glow * 2}px ${glow}`,
                    height: SWEEP.line,
                    top: line,
                }}
            />
        </div>
    );
}

export function ThinkingOrb() {
    const { theme } = useReplica();
    return (
        <svg height={ORB_SIZE} viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`} width={ORB_SIZE}>
            {ORB_DOTS.map(([x, y, r, white, opacity]) => {
                const grey = Math.round((theme === "dark" ? 1 - white : white) * 255);
                return (
                    <circle cx={x} cy={y} fill={`rgb(${grey} ${grey} ${grey} / ${opacity})`} key={`${x}-${y}`} r={r} />
                );
            })}
        </svg>
    );
}

export function PhotoStage({ children, style }: { children?: ReactNode; style?: FrameStyle }) {
    return (
        <div
            className="bg-surface overflow-hidden"
            {...frameAttrs(style)}
            style={{ borderRadius: STAGE.radius, height: STAGE.height, width: STAGE.width, ...style }}
        >
            <ReceiptPhoto height={STAGE.height} width={STAGE.width} />
            {children}
        </div>
    );
}

function Shell({ bottom, children, scroll = false }: { bottom: ReactNode; children: ReactNode; scroll?: boolean }) {
    return (
        <>
            {scroll ? (
                <div className="flex-1 overflow-hidden px-5 pt-2 pb-6">{children}</div>
            ) : (
                <div className="flex-1 items-center justify-center gap-6 px-6">{children}</div>
            )}
            <div
                className={scroll ? "border-separator gap-2 border-t px-5 pt-3" : "gap-2 px-5"}
                style={{ paddingBottom: MODAL.bottom }}
            >
                {bottom}
            </div>
        </>
    );
}

export function IntroBar({ style }: { style?: FrameStyle }) {
    const { t } = useReplica();
    return (
        <div {...frameAttrs(style)} style={style}>
            <ButtonPair
                primary={
                    <CaptureButton icon={Camera01Icon} variant="primary">
                        {t("receipt.action.camera")}
                    </CaptureButton>
                }
                secondary={
                    <CaptureButton icon={Image01Icon} variant="secondary">
                        {t("receipt.action.library")}
                    </CaptureButton>
                }
            />
        </div>
    );
}

export function ScanIntro({ style }: { style?: FrameStyle }) {
    const { t } = useReplica();
    return (
        <ModalBody style={style}>
            <Shell bottom={<IntroBar />}>
                <ReceiptFrame />
                <div className="items-center gap-2 px-4">
                    <span className="font-sans-semibold text-foreground text-title text-center">
                        {t("receipt.title")}
                    </span>
                    <span className="text-muted text-center font-sans text-base" style={BASE}>
                        {t("receipt.intro")}
                    </span>
                </div>
            </Shell>
        </ModalBody>
    );
}

export function ReadingStatus({ style }: { style?: FrameStyle }) {
    const { t } = useReplica();
    return (
        <div className="flex-row items-center justify-center gap-2" {...frameAttrs(style)} style={style}>
            <ThinkingOrb />
            <StatusLine>{t("receipt.state.reading")}</StatusLine>
        </div>
    );
}

export function ScanReading({
    stage,
    status,
    style,
    sweep,
}: {
    stage?: FrameStyle;
    status?: FrameStyle;
    style?: FrameStyle;
    sweep?: FrameStyle;
}) {
    const { t } = useReplica();
    return (
        <ModalBody style={style}>
            <Shell bottom={<CaptureButton variant="ghost">{t("common.cancel")}</CaptureButton>}>
                <PhotoStage style={stage}>
                    <ScanSweep style={sweep} />
                </PhotoStage>
                <ReadingStatus style={status} />
            </Shell>
        </ModalBody>
    );
}

const LINE_STAGGER = 0.034;

const entrance = (enter: number | undefined, delay: number, duration: number) =>
    enter === undefined ? undefined : frameTimes(enter + delay, undefined, duration);

function Thumb() {
    return (
        <div
            className="bg-surface overflow-hidden"
            style={{ borderRadius: THUMB.radius, height: THUMB.height, width: THUMB.width }}
        >
            <ReceiptPhoto height={THUMB.height} width={THUMB.width} />
        </div>
    );
}

function Fade({ children, className = "", style }: { children: ReactNode; className?: string; style?: FrameStyle }) {
    return (
        <div className={className} {...frameAttrs(style)} style={style}>
            {children}
        </div>
    );
}

export function ScanReview({ enter, style }: { enter?: number; style?: FrameStyle }) {
    const { locale, t } = useReplica();
    const { labels } = getIntlayer("appUi", locale);
    const currency = currencyFor(locale);
    const money = (value: number) => formatAmount(value, currency, locale);
    const summaryDelay = 0.08 + ITEMS.length * LINE_STAGGER + 0.04;
    return (
        <ModalBody style={style}>
            <Shell
                bottom={
                    <ButtonPair
                        primary={<CaptureButton variant="primary">{t("receipt.action.save")}</CaptureButton>}
                        secondary={<CaptureButton variant="secondary">{t("receipt.action.edit")}</CaptureButton>}
                        tertiary={<CaptureButton variant="ghost">{t("receipt.action.another")}</CaptureButton>}
                    />
                }
                scroll
            >
                <div className="gap-6">
                    <div className="flex-row items-start gap-4">
                        <Thumb />
                        <Fade className="flex-1 gap-1 pt-1" style={entrance(enter, 0.12, 0.26)}>
                            <div className="flex-row items-center gap-2">
                                <span className="font-sans-medium text-grammar text-title">
                                    {t("receipt.review.at")}
                                </span>
                                <div
                                    className="overflow-hidden"
                                    style={{ borderRadius: MARK.radius, height: MARK.size, width: MARK.size }}
                                >
                                    <img
                                        alt=""
                                        height={MARK.size}
                                        loading="lazy"
                                        src={`/media/logos/${LOGO}.webp`}
                                        style={{
                                            height: MARK.size,
                                            objectFit: "cover",
                                            transform: `scale(${MARK.zoom})`,
                                            width: MARK.size,
                                        }}
                                        width={MARK.size}
                                    />
                                </div>
                                <span className="font-sans-medium text-foreground text-title">{MERCHANT}</span>
                            </div>
                            <span className="text-muted font-sans text-base" style={BASE}>
                                {t(CATEGORY_KEYS.Groceries)}
                                <span className="text-subtle"> · </span>
                                {formatDayTitle(DEMO_NOW, DEMO_NOW, locale, t)}
                            </span>
                            <span className="text-subtle text-footnote font-sans">
                                {t("receipt.review.paid", { method: labels.receiptMethod })}
                            </span>
                        </Fade>
                    </div>
                    <Fade className="gap-1" style={entrance(enter, 0.18, 0.28)}>
                        <span
                            className="font-sans-semibold text-foreground text-hero tabular-nums"
                            style={{ marginBottom: -HERO_RISE, marginTop: HERO_RISE }}
                        >
                            {money(TOTAL)}
                        </span>
                    </Fade>
                    <div className="gap-6">
                        <div>
                            <Fade
                                className="border-separator flex-row items-baseline border-b pb-2"
                                style={entrance(enter, 0.06, 0.2)}
                            >
                                <span className="text-muted text-footnote flex-1 font-sans">
                                    {t("receipt.items", { count: ITEMS.length })}
                                </span>
                                <span className="text-subtle text-footnote font-sans">{currency}</span>
                            </Fade>
                            {labels.receiptLines.map((line, index) => (
                                <Fade
                                    className={`flex-row items-baseline gap-3 py-2.5 ${index === ITEMS.length - 1 ? "" : "border-separator border-b"}`}
                                    key={line}
                                    style={entrance(enter, 0.08 + index * LINE_STAGGER, 0.24)}
                                >
                                    <span className="text-foreground flex-1 font-sans text-base" style={BASE}>
                                        {line}
                                    </span>
                                    <span
                                        className="text-foreground font-sans-medium text-base tabular-nums"
                                        style={BASE}
                                    >
                                        {money(ITEMS[index] ?? 0)}
                                    </span>
                                </Fade>
                            ))}
                        </div>
                        <div className="border-separator border-t pt-2">
                            <Fade
                                className="flex-row items-baseline gap-3 py-1.5"
                                style={entrance(enter, summaryDelay, 0.24)}
                            >
                                <span className="font-sans-semibold text-foreground flex-1 text-base" style={BASE}>
                                    {t("receipt.review.total")}
                                </span>
                                <span
                                    className="font-sans-semibold text-foreground text-base tabular-nums"
                                    style={BASE}
                                >
                                    {money(TOTAL)}
                                </span>
                            </Fade>
                        </div>
                    </div>
                </div>
            </Shell>
        </ModalBody>
    );
}

export function scanFigures(locale: CanvasProps["locale"]) {
    const { labels } = getIntlayer("appUi", locale);
    return {
        amount: formatAmount(TOTAL, currencyFor(locale), locale),
        count: ITEMS.length,
        merchant: MERCHANT,
        method: labels.receiptMethod,
    };
}

function scanLabel(step: ScanStep, locale: CanvasProps["locale"]) {
    const { labels } = getIntlayer("appUi", locale);
    const figures = scanFigures(locale);
    if (step === "intro") {
        return labels.scanIntro;
    }
    if (step === "reading") {
        return interpolate(labels.scanReading, figures);
    }
    const t = appTranslator(locale);
    return interpolate(labels.scanReview, { ...figures, category: t(CATEGORY_KEYS.Groceries) });
}

const STEP_BODY = {
    intro: ScanIntro,
    reading: ScanReading,
    review: ScanReview,
} as const satisfies Record<ScanStep, (props: Record<string, never>) => ReactNode>;

export interface ScanScreenProps extends CanvasProps {
    step: ScanStep;
}

export function ScanScreen({ step, ...canvas }: ScanScreenProps) {
    const Body = STEP_BODY[step];
    return (
        <AppScreen {...canvas} label={scanLabel(step, canvas.locale)}>
            <ModalBackdrop />
            <Body />
        </AppScreen>
    );
}
