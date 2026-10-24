import type { CSSProperties } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

import { BigMoney, CategoryTile, Film, formatMoney, Micro, Panel, reveal, RuledHeader, useSeconds } from "./kit";
import type { Category } from "./kit";
import { band, GLIDE, mix, MONO, ramp, useLocale, useTheme, wave } from "./theme";
import type { FilmProps, Locale } from "./theme";

export const MONTH_SECONDS = 9;

const PANEL = { height: 942, width: 780 };
const BARS = [0.35, 0.09, 0.58, 0.3, 0.95, 0.42, 0];
const TRACK = 175;
const AVERAGE = 0.4;
const EXIT = 7.3;

const EN = {
    days: ["S", "M", "T", "W", "T", "F", "S"],
    fresh: "new",
    income: "Income",
    movers: "Movers",
    names: { groceries: "Groceries", rent: "Rent", utilities: "Utilities" },
    net: "Net",
    range: "Spent · 6 – 12 Sep",
    verdict: "$1,685.51 less than 30 Aug – 5 Sep. Rent alone gave back $1,850.00.",
    versus: "vs 30 Aug – 5 Sep",
};

const COPY: Record<Locale, typeof EN> = {
    en: EN,
    es: {
        days: ["D", "L", "M", "X", "J", "V", "S"],
        fresh: "nuevo",
        income: "Ingreso",
        movers: "Cambios",
        names: { groceries: "Súper", rent: "Renta", utilities: "Servicios" },
        net: "Neto",
        range: "Gastado · 6 – 12 sep",
        verdict: "$1,685.51 menos que 30 ago – 5 sep. Solo Renta bajó $1,850.00.",
        versus: "vs. 30 ago – 5 sep",
    },
};

const MOVERS: readonly { amount: number; category: Category; change?: string }[] = [
    { amount: -1850, category: "rent", change: "−100%" },
    { amount: 122.46, category: "groceries", change: "+95%" },
    { amount: 112.34, category: "utilities" },
];

const out = (t: number, order: number) => 1 - ramp(t, EXIT + order * 0.05, 0.7, GLIDE);

function Scene() {
    const t = useSeconds();
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const { height, width } = useVideoConfig();
    const count = ramp(t, 0.25, 1.7);
    const totals = ramp(t, 0.9, 1.2);
    const chip = ramp(t, 1.85, 0.5) * out(t, 0);
    const average = ramp(t, 1.9, 0.7);
    const show = (start: number, order: number, duration = 0.8): CSSProperties =>
        reveal(ramp(t, start, duration) * out(t, order), 34, 16);
    const settle = ramp(t, 0, 2.6, GLIDE) * (1 - ramp(t, EXIT, 1.6, GLIDE));
    const zoom = mix(0.94, 1, settle);
    const panelTop = (height - PANEL.height) / 2;
    return (
        <AbsoluteFill style={{ perspective: 2200 }}>
            <AbsoluteFill
                style={{
                    transform: `rotateX(${mix(9, 2.5, settle) + 1.2 * wave(t, MONTH_SECONDS)}deg) rotateY(${mix(-7, -1.5, settle) + 1.8 * wave(t, MONTH_SECONDS, 1.4)}deg)`,
                    transformStyle: "preserve-3d",
                }}
            >
                <div style={{ left: 0, position: "absolute", top: 0, height, transform: `scale(${zoom})`, width }}>
                    <Panel
                        style={{
                            height: PANEL.height,
                            left: (width - PANEL.width) / 2,
                            position: "absolute",
                            top: panelTop,
                            width: PANEL.width,
                        }}
                    >
                        <div style={{ alignItems: "center", display: "flex", gap: 14, height: 34 }}>
                            <Micro>{copy.range}</Micro>
                            <span
                                style={{
                                    background: theme.chip,
                                    borderRadius: 7,
                                    color: theme.income,
                                    filter: chip < 1 ? `blur(${(1 - chip) * 8}px)` : undefined,
                                    fontFamily: MONO,
                                    fontSize: 19,
                                    lineHeight: "30px",
                                    opacity: chip,
                                    padding: "0 9px",
                                    scale: String(mix(0.6, 1, chip)),
                                }}
                            >
                                −74%
                            </span>
                        </div>
                        <div style={{ height: 120, marginTop: 14, ...show(0.25, 1) }}>
                            <BigMoney sign="−" size={120} value={mix(0, 597.95, count)} />
                        </div>
                        <p
                            style={{
                                color: theme.muted,
                                fontSize: 23,
                                height: 64,
                                lineHeight: 1.4,
                                margin: "14px 0 0",
                                ...show(0.7, 2),
                            }}
                        >
                            {copy.verdict}
                        </p>
                        <div
                            style={{
                                borderTop: `1.5px solid ${theme.rule}`,
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                height: 92,
                                marginTop: 24,
                                paddingTop: 16,
                                ...show(0.9, 3),
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <Micro style={{ fontSize: 17 }}>{copy.income}</Micro>
                                <b style={{ color: theme.income, fontSize: 28, fontWeight: 600 }}>
                                    {formatMoney(mix(0, 1450, totals), { plus: true })}
                                </b>
                            </div>
                            <div
                                style={{
                                    borderLeft: `1.5px solid ${theme.rule}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    paddingLeft: 22,
                                }}
                            >
                                <Micro style={{ fontSize: 17 }}>{copy.net}</Micro>
                                <b style={{ fontSize: 28, fontWeight: 600 }}>
                                    {formatMoney(mix(0, 852.05, totals), { plus: true })}
                                </b>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gap: 12,
                                gridTemplateColumns: "repeat(7, 1fr)",
                                marginTop: 30,
                                position: "relative",
                            }}
                        >
                            {BARS.map((bar, i) => {
                                const grow = ramp(t, 1.1 + i * 0.08, 0.95) * out(t, 4 + i * 0.3);
                                return (
                                    <div
                                        key={`${copy.days[i]}${i}`}
                                        style={{
                                            alignItems: "center",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: theme.track,
                                                borderRadius: 8,
                                                height: TRACK,
                                                opacity: mix(0.35, 1, grow),
                                                overflow: "hidden",
                                                position: "relative",
                                                width: "100%",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: theme.fg,
                                                    borderRadius: 8,
                                                    bottom: 0,
                                                    height: TRACK * bar * grow,
                                                    left: 0,
                                                    position: "absolute",
                                                    right: 0,
                                                }}
                                            />
                                        </div>
                                        <span
                                            style={{
                                                color: theme.muted,
                                                fontFamily: MONO,
                                                fontSize: 17,
                                                opacity: grow,
                                            }}
                                        >
                                            {copy.days[i]}
                                        </span>
                                    </div>
                                );
                            })}
                            <div
                                style={{
                                    borderTop: `2px dashed ${theme.muted}`,
                                    left: 0,
                                    opacity: out(t, 6),
                                    position: "absolute",
                                    top: TRACK * (1 - AVERAGE),
                                    width: `${average * 100}%`,
                                }}
                            >
                                <span
                                    style={{
                                        color: theme.muted,
                                        fontFamily: MONO,
                                        fontSize: 15,
                                        left: 8,
                                        opacity: band(average, 0.3, 1),
                                        position: "absolute",
                                        top: -24,
                                    }}
                                >
                                    $85
                                </span>
                            </div>
                        </div>
                        <RuledHeader
                            left={copy.movers}
                            right={copy.versus}
                            style={{ marginTop: 34, ...show(2.2, 7) }}
                        />
                        <div style={{ marginTop: 8 }}>
                            {MOVERS.map((mover, i) => (
                                <div
                                    key={mover.category}
                                    style={{
                                        alignItems: "center",
                                        display: "grid",
                                        gap: 20,
                                        gridTemplateColumns: "auto 1fr auto 86px",
                                        height: 62,
                                        ...show(2.4 + i * 0.1, 8 + i),
                                    }}
                                >
                                    <CategoryTile category={mover.category} size={50} />
                                    <span style={{ fontSize: 26, fontWeight: 500 }}>{copy.names[mover.category]}</span>
                                    <span
                                        style={{ color: mover.amount < 0 ? theme.income : theme.spend, fontSize: 26 }}
                                    >
                                        {formatMoney(mover.amount, { plus: true })}
                                    </span>
                                    <span
                                        style={{
                                            color: theme.muted,
                                            fontFamily: MONO,
                                            fontSize: 19,
                                            textAlign: "right",
                                        }}
                                    >
                                        {mover.change ?? copy.fresh}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
}

export function Month({ locale, mode }: FilmProps) {
    return (
        <Film locale={locale} mode={mode}>
            <Scene />
        </Film>
    );
}
