import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

import {
    COSTCO,
    EntryRow,
    Film,
    Icon,
    Micro,
    Panel,
    Receipt,
    RECEIPT_LINES,
    RECEIPT_SIZE,
    receiptLineCenter,
    reveal,
    RuledHeader,
    useSeconds,
} from "./kit";
import { band, GLIDE, mix, MONO, ramp, useLocale, useTheme, wave } from "./theme";
import type { FilmProps, Locale } from "./theme";

export const CAPTURE_SECONDS = 12;

const TAGS = ["amount", "merchant", "category", "account", "date"] as const;
type Tag = (typeof TAGS)[number];

const EN = {
    labels: { account: "account", amount: "amount", category: "category", date: "date", merchant: "merchant" },
    newEntry: "New entry",
    sentence: "spent 42 at costco for groceries from chase today",
    slots: { account: "chase", amount: "42", category: "groceries", date: "today", merchant: "costco" },
    today: "Today",
};

const COPY: Record<Locale, typeof EN> = {
    en: EN,
    es: {
        labels: { account: "cuenta", amount: "monto", category: "categoría", date: "fecha", merchant: "comercio" },
        newEntry: "Nuevo registro",
        sentence: "gasté 42 en costco para súper con chase hoy",
        slots: { account: "chase", amount: "42", category: "súper", date: "hoy", merchant: "costco" },
        today: "Hoy",
    },
};

const TYPE_START = 0.45;
const VOICE = 5;
const SCAN = 8.6;
const RESET = 11.2;
const CARD_WIDTH = 880;
const BODY_HEIGHT = 236;
const BARS = 42;

interface Segment {
    end: number;
    start: number;
    tag?: Tag;
}

function scriptFor(copy: typeof EN) {
    const { sentence } = copy;
    const tokens = TAGS.map((tag) => ({
        start: sentence.indexOf(` ${copy.slots[tag]}`) + 1,
        tag,
        word: copy.slots[tag],
    }));
    const typedAt: number[] = [];
    let clock = TYPE_START;
    for (let i = 0; i < sentence.length; i += 1) {
        const noise = Math.abs(Math.sin(i * 12.9898) * 43_758.5453) % 1;
        clock += 0.034 + 0.026 * noise + (sentence[i] === " " ? 0.04 : 0);
        typedAt.push(clock);
    }
    const segments: Segment[] = [];
    let cursor = 0;
    for (const token of tokens) {
        segments.push(
            { end: token.start, start: cursor },
            { end: token.start + token.word.length, start: token.start, tag: token.tag }
        );
        cursor = token.start + token.word.length;
    }
    segments.push({ end: sentence.length, start: cursor });
    const words = sentence.split(" ");
    return {
        ...copy,
        segments: segments.filter((segment) => segment.end > segment.start),
        tokens,
        typedAt,
        typedEnd: typedAt.at(-1) ?? TYPE_START,
        wordStart: words.map((_, i) => words.slice(0, i).join(" ").length + (i > 0 ? 1 : 0)),
        words,
    };
}

const SCRIPTS: Record<Locale, ReturnType<typeof scriptFor>> = { en: scriptFor(COPY.en), es: scriptFor(COPY.es) };

function Caret({ on }: { on: number }) {
    const theme = useTheme();
    return (
        <span style={{ display: "inline-block", position: "relative", width: 0 }}>
            <span
                style={{
                    background: theme.tint,
                    borderRadius: 2,
                    height: 62,
                    left: 1,
                    opacity: on,
                    position: "absolute",
                    top: -50,
                    width: 3.5,
                }}
            />
        </span>
    );
}

function Sentence({
    typed,
    caret,
    lit,
    wordIn,
}: {
    caret: number | null;
    lit: (tag: Tag) => number;
    typed: number;
    wordIn: (index: number) => number;
}) {
    const theme = useTheme();
    const script = SCRIPTS[useLocale()];
    const chars = (from: number, to: number) => {
        const parts: ReactNode[] = [];
        for (let i = from; i < to; i += 1) {
            const word = script.wordStart.filter((start) => start <= i).length - 1;
            const shown = i < typed ? wordIn(word) : 0;
            parts.push(
                <span
                    key={i}
                    style={{
                        filter: shown > 0 && shown < 1 ? `blur(${(1 - shown) * 10}px)` : undefined,
                        opacity: shown,
                    }}
                >
                    {script.sentence[i]}
                </span>
            );
            if (caret !== null && i + 1 === typed) {
                parts.push(<Caret key="caret" on={caret} />);
            }
        }
        return parts;
    };
    return (
        <div style={{ fontSize: 54, letterSpacing: "-0.015em", lineHeight: 2.2, marginTop: -14 }}>
            {caret !== null && typed === 0 ? <Caret on={caret} /> : null}
            {script.segments.map((segment) => {
                if (!segment.tag) {
                    return <span key={segment.start}>{chars(segment.start, segment.end)}</span>;
                }
                const on = lit(segment.tag);
                return (
                    <span
                        key={segment.start}
                        style={{
                            background: `color-mix(in srgb, ${theme.tintWash} ${on * 100}%, transparent)`,
                            borderRadius: 12,
                            color: `color-mix(in srgb, ${theme.tint} ${on * 100}%, ${theme.fg})`,
                            display: "inline-block",
                            lineHeight: 1.3,
                            margin: "0 -3px",
                            padding: "0 7px 2px",
                            position: "relative",
                        }}
                    >
                        <span
                            style={{
                                bottom: "100%",
                                color: theme.tint,
                                fontFamily: MONO,
                                fontSize: 16,
                                left: 7,
                                letterSpacing: "0.12em",
                                lineHeight: 1,
                                marginBottom: 7,
                                opacity: on,
                                position: "absolute",
                                textTransform: "uppercase",
                                translate: `0 ${(1 - on) * 10}px`,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {script.labels[segment.tag]}
                        </span>
                        {chars(segment.start, segment.end)}
                    </span>
                );
            })}
        </div>
    );
}

function Waveform({ t, level }: { level: number; t: number }) {
    const theme = useTheme();
    return (
        <div style={{ alignItems: "center", display: "flex", gap: 7, height: BODY_HEIGHT, justifyContent: "center" }}>
            {Array.from({ length: BARS }, (_, i) => {
                const taper = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / BARS);
                const voice = 0.18 + 0.82 * Math.abs(Math.sin(t * 7.3 + i * 0.47) * Math.sin(t * 3.7 + i * 0.19 + 1.3));
                return (
                    <span
                        key={i}
                        style={{
                            background: theme.tint,
                            borderRadius: 4,
                            height: 8 + 150 * level * taper * voice,
                            opacity: mix(0.45, 1, level),
                            width: 7,
                        }}
                    />
                );
            })}
        </div>
    );
}

function ModeIcon({ t }: { t: number }) {
    const theme = useTheme();
    const voice = ramp(t, VOICE + 0.1, 0.5) * (1 - ramp(t, RESET, 0.4));
    return (
        <div style={{ height: 34, position: "relative", width: 34 }}>
            <div style={{ inset: 0, opacity: 1 - voice, position: "absolute" }}>
                <Icon color={theme.muted} name="keyboard" size={34} />
            </div>
            <div style={{ inset: 0, opacity: voice, position: "absolute" }}>
                <Icon color={theme.tint} name="mic" size={34} />
            </div>
        </div>
    );
}

function Field({ t }: { t: number }) {
    const script = SCRIPTS[useLocale()];
    const typingOut = ramp(t, VOICE, 0.45, GLIDE);
    const level = ramp(t, VOICE + 0.45, 0.35) * (1 - ramp(t, VOICE + 1.8, 0.35, GLIDE));
    const voiced = t >= VOICE + 1.9 && t < RESET;
    const typed = voiced ? script.sentence.length : script.typedAt.filter((at) => at <= t).length;
    const wordIn = (word: number) => {
        if (!voiced) {
            return 1 - typingOut;
        }
        return ramp(t, VOICE + 1.95 + word * 0.06, 0.55) * (1 - ramp(t, SCAN, 0.4, GLIDE));
    };
    const lit = (tag: Tag) => {
        const index = script.tokens.findIndex((token) => token.tag === tag);
        const token = script.tokens[index];
        if (voiced) {
            return (
                ramp(t, VOICE + 2.15 + script.words.indexOf(token.word) * 0.06, 0.5) * (1 - ramp(t, SCAN, 0.4, GLIDE))
            );
        }
        const recognized = script.typedAt[Math.min(script.sentence.length - 1, token.start + token.word.length)] + 0.12;
        return ramp(t, recognized, 0.5) * (1 - typingOut);
    };
    const idle = t < TYPE_START || t > RESET;
    const blink = !idle || Math.cos(2 * Math.PI * t) > -0.2 ? 1 : 0;
    const caret = t < script.typedEnd + 0.6 || t > RESET ? blink : null;
    return (
        <>
            {level > 0.001 ? (
                <div style={{ inset: 0, position: "absolute" }}>
                    <Waveform level={level} t={t} />
                </div>
            ) : null}
            <Sentence caret={caret} lit={lit} typed={t > RESET ? 0 : typed} wordIn={wordIn} />
        </>
    );
}

function ScannedReceipt({ t }: { t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const scanStart = SCAN + 1;
    const scanDuration = 1.1;
    const scan = ramp(t, scanStart, scanDuration, GLIDE);
    const scanning = t > scanStart && t < scanStart + scanDuration + 0.25;
    const markAt = (line: number) =>
        ramp(t, scanStart + scanDuration * (receiptLineCenter(line) / RECEIPT_SIZE.height), 0.4);
    const marks: number[] = [];
    const tags: readonly { line: number; tag: Tag }[] = [
        { line: RECEIPT_LINES.merchant, tag: "merchant" },
        { line: RECEIPT_LINES.total, tag: "amount" },
        { line: RECEIPT_LINES.account, tag: "account" },
        { line: RECEIPT_LINES.date, tag: "date" },
    ];
    for (const { line } of tags) {
        marks[line] = markAt(line);
    }
    return (
        <div style={{ height: RECEIPT_SIZE.height, position: "relative", width: RECEIPT_SIZE.width }}>
            <Receipt marks={marks} />
            {scanning ? (
                <div
                    style={{
                        background: `linear-gradient(to bottom, transparent, ${theme.tintWash})`,
                        borderBottom: `3px solid ${theme.tint}`,
                        height: 70,
                        left: -8,
                        opacity: band(scan, 0, 0.04) * (1 - band(scan, 0.96, 1)),
                        position: "absolute",
                        right: -8,
                        top: scan * RECEIPT_SIZE.height - 70,
                    }}
                />
            ) : null}
            {tags.map(({ line, tag }) => {
                const on = markAt(line);
                return (
                    <div
                        key={tag}
                        style={{
                            alignItems: "center",
                            display: "flex",
                            gap: 10,
                            left: RECEIPT_SIZE.width + 14,
                            opacity: on,
                            position: "absolute",
                            top: receiptLineCenter(line) - 11.5,
                            translate: `${(1 - on) * -14}px 0`,
                        }}
                    >
                        <span style={{ background: theme.tint, height: 1.5, width: 24 }} />
                        <span
                            style={{
                                background: theme.tintWash,
                                borderRadius: 8,
                                color: theme.tint,
                                fontFamily: MONO,
                                fontSize: 14,
                                letterSpacing: "0.12em",
                                lineHeight: "23px",
                                padding: "0 9px",
                                textTransform: "uppercase",
                            }}
                        >
                            {copy.labels[tag]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function Result({ style }: { style: CSSProperties }) {
    const locale = useLocale();
    return (
        <Panel style={{ padding: "34px 44px 24px", width: CARD_WIDTH, ...style }}>
            <RuledHeader left={COPY[locale].today} right="−$42.00" />
            <EntryRow entry={COSTCO[locale]} height={104} style={{ marginTop: 8 }} />
        </Panel>
    );
}

export function Capture({ locale, mode }: FilmProps) {
    return (
        <Film locale={locale} mode={mode}>
            <Scene />
        </Film>
    );
}

function Scene() {
    const t = useSeconds();
    const { height, width } = useVideoConfig();
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const top = height / 2 - 345;
    const left = (width - CARD_WIDTH) / 2;
    const fieldShown = 1 - ramp(t, SCAN, 0.5, GLIDE) + ramp(t, RESET + 0.1, 0.55);
    const result = (at: number, out: number) => ramp(t, at, 0.9) * (1 - ramp(t, out, 0.45, GLIDE));
    const resultShown = result(3.45, VOICE) + result(VOICE + 2.55, SCAN) + result(SCAN + 2.15, RESET);
    const receiptIn = ramp(t, SCAN + 0.25, 0.9);
    const receiptOut = ramp(t, RESET, 0.5, GLIDE);
    const scanning = ramp(t, SCAN + 0.1, 0.8) * (1 - ramp(t, RESET, 0.7));
    const shift = mix(mix(160, 0, resultShown), mix(190, 64, resultShown), scanning);
    return (
        <AbsoluteFill style={{ perspective: 2400 }}>
            <AbsoluteFill
                style={{
                    transform: `translateY(${shift}px) rotateX(${3 + 1.5 * wave(t, CAPTURE_SECONDS)}deg) rotateY(${-2.5 * wave(t, CAPTURE_SECONDS, 1.2)}deg)`,
                    transformStyle: "preserve-3d",
                }}
            >
                {fieldShown > 0.001 ? (
                    <Panel
                        style={{
                            left,
                            position: "absolute",
                            top,
                            width: CARD_WIDTH,
                            ...reveal(Math.min(1, fieldShown), -30),
                            scale: String(mix(0.96, 1, Math.min(1, fieldShown))),
                        }}
                    >
                        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                            <Micro>{copy.newEntry}</Micro>
                            <ModeIcon t={t} />
                        </div>
                        <div style={{ height: BODY_HEIGHT, marginTop: 22, position: "relative" }}>
                            <Field t={t} />
                        </div>
                    </Panel>
                ) : null}
                {receiptIn > 0 && receiptOut < 1 ? (
                    <div
                        style={{
                            left: width / 2 - RECEIPT_SIZE.width / 2 - 90,
                            opacity: 1 - receiptOut,
                            position: "absolute",
                            top: top - 114,
                            filter: receiptOut > 0 ? `blur(${receiptOut * 14}px)` : undefined,
                            transform: `translate3d(${(1 - receiptIn) * 760}px, ${receiptOut * -40}px, ${(1 - receiptIn) * 160}px) rotate(${mix(9, -1.5, receiptIn)}deg) scale(1.12)`,
                            transformOrigin: "50% 0",
                        }}
                    >
                        <ScannedReceipt t={t} />
                    </div>
                ) : null}
                {resultShown > 0.001 ? (
                    <Result
                        style={{
                            left,
                            position: "absolute",
                            top: top + 470,
                            ...reveal(resultShown, 50),
                            boxShadow: theme.lift,
                        }}
                    />
                ) : null}
            </AbsoluteFill>
        </AbsoluteFill>
    );
}
