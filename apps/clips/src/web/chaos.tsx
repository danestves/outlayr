import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

import { EntryRow, Film, formatMoney, Logo, Receipt, RECEIPT_SIZE, RuledHeader, useSeconds } from "./kit";
import type { Entry } from "./kit";
import { band, GLIDE, mix, MONO, ramp, useLocale, useTheme, wave } from "./theme";
import type { FilmProps, Locale } from "./theme";

export const CHAOS_SECONDS = 11;

const SNAP = 4;
const LOOSEN = 8.4;
const PANEL = { height: 840, width: 800 };
const ROW = { height: 92, width: 712 };
const HEADER = 40;
const ACCOUNT_ROWS_TOP = 86;
const WEEK_HEADER_TOP = 300;
const WEEK_ROWS_TOP = 346;

const EN = {
    accounts: "Accounts · 2",
    amazonDate: "Sep 13",
    amazonOrder: "ORDER",
    amazonTitle: "Your Prime membership renewed",
    cash: "Cash",
    csvFile: "chase_activity_0914.csv",
    csvLines: [
        "Date,Description,Amount",
        "09/14/2026,VZWRLSS*APOCC VISB,-85.00",
        "09/14/2026,POS COSTCO WHSE #1157,-42.00",
        "09/13/2026,AMZN PRIME*2K4LM0,-139.00",
    ],
    envelope: "CASH · SEPT",
    groceries: "Groceries",
    netflixBody: "$22.99 will be charged to your card.",
    netflixTitle: "Your membership renews 1 Oct",
    now: "now",
    pending: "Pending",
    subscriptions: "Subscriptions",
    utilities: "Utilities",
    week: "This week",
};

type Copy = typeof EN;

const COPY: Record<Locale, Copy> = {
    en: EN,
    es: {
        accounts: "Cuentas · 2",
        amazonDate: "13 sep",
        amazonOrder: "PEDIDO",
        amazonTitle: "Tu membresía Prime se renovó",
        cash: "Efectivo",
        csvFile: "chase_movimientos_1409.csv",
        csvLines: [
            "Fecha,Descripción,Monto",
            "14/09/2026,VZWRLSS*APOCC VISB,-85.00",
            "14/09/2026,POS COSTCO WHSE #1157,-42.00",
            "13/09/2026,AMZN PRIME*2K4LM0,-139.00",
        ],
        envelope: "EFECTIVO · SEP",
        groceries: "Súper",
        netflixBody: "Se cobrarán $22.99 a tu tarjeta.",
        netflixTitle: "Tu membresía se renueva el 1 oct",
        now: "ahora",
        pending: "Pendiente",
        subscriptions: "Suscripciones",
        utilities: "Servicios",
        week: "Esta semana",
    },
};

interface Scrap {
    chaos: { r: number; x: number; y: number; z: number };
    entry: (copy: Copy) => Entry;
    id: string;
    radius: number;
    size: { h: number; w: number };
    slot: number;
    visual: () => ReactNode;
}

function Card({ children, radius, style }: { children: ReactNode; radius: number; style?: CSSProperties }) {
    const theme = useTheme();
    return (
        <div
            style={{
                background: theme.card,
                borderRadius: radius,
                boxShadow: `inset 0 0 0 1.5px ${theme.edge}`,
                height: "100%",
                width: "100%",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

function Netflix() {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    return (
        <Card radius={34} style={{ display: "flex", gap: 18, padding: "22px 24px" }}>
            <Logo bare name="netflix" size={48} />
            <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 3 }}>
                <div
                    style={{
                        color: theme.muted,
                        display: "flex",
                        fontSize: 15,
                        justifyContent: "space-between",
                        letterSpacing: "0.04em",
                    }}
                >
                    <span style={{ fontWeight: 600 }}>NETFLIX</span>
                    <span>{copy.now}</span>
                </div>
                <span style={{ fontSize: 21, fontWeight: 600 }}>{copy.netflixTitle}</span>
                <span style={{ color: theme.muted, fontSize: 18 }}>{copy.netflixBody}</span>
            </div>
        </Card>
    );
}

function Spotify() {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    return (
        <Card radius={22} style={{ alignItems: "center", display: "flex", gap: 18, padding: "0 24px" }}>
            <Logo bare name="spotify" size={52} />
            <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "0.02em" }}>SPOTIFY USA</span>
                <span style={{ color: theme.muted, fontSize: 17 }}>{copy.pending} · Apple Card</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 600 }}>$11.99</span>
        </Card>
    );
}

function Amazon() {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    return (
        <Card radius={18} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "20px 24px" }}>
            <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
                <Logo bare name="amazon" size={36} />
                <span style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>Amazon.com</span>
                <span style={{ color: theme.muted, fontSize: 15 }}>{copy.amazonDate}</span>
            </div>
            <span style={{ fontSize: 21, fontWeight: 600, marginTop: 4 }}>{copy.amazonTitle}</span>
            <span style={{ color: theme.muted, fontSize: 17 }}>$139.00 · Amex Gold ••1009</span>
            <span style={{ color: theme.muted, fontFamily: MONO, fontSize: 13, letterSpacing: "0.06em" }}>
                {copy.amazonOrder} #112-4417203-5521
            </span>
        </Card>
    );
}

function Envelope() {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    return (
        <div
            style={{
                background: theme.kraft,
                borderRadius: 6,
                color: theme.paperInk,
                height: "100%",
                position: "relative",
                width: "100%",
            }}
        >
            <svg height="100%" style={{ inset: 0, position: "absolute" }} viewBox="0 0 290 180" width="100%">
                <path d="M0 0 145 92 290 0" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.5" />
                <path d="M0 180 112 74M290 180 178 74" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
            </svg>
            <span
                style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    left: 22,
                    letterSpacing: "0.14em",
                    position: "absolute",
                    top: 104,
                }}
            >
                {copy.envelope}
            </span>
            <span
                style={{
                    fontSize: 46,
                    fontWeight: 600,
                    left: 20,
                    letterSpacing: "-0.02em",
                    position: "absolute",
                    top: 120,
                }}
            >
                $220
            </span>
        </div>
    );
}

function BanescoBalance() {
    const theme = useTheme();
    return (
        <Card radius={28} style={{ display: "flex", flexDirection: "column", padding: "24px 26px" }}>
            <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
                <Logo bare name="banesco" size={46} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 19, fontWeight: 600 }}>Banesco</span>
                    <span style={{ color: theme.muted, fontSize: 15 }}>Cuenta corriente ••7731</span>
                </div>
            </div>
            <span style={{ color: theme.muted, fontSize: 15, marginTop: 18 }}>Saldo disponible</span>
            <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em" }}>Bs.486,000.00</span>
        </Card>
    );
}

function Csv() {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    return (
        <Card radius={14} style={{ fontFamily: MONO, overflow: "hidden" }}>
            <div
                style={{
                    borderBottom: `1.5px solid ${theme.edge}`,
                    color: theme.muted,
                    fontSize: 14,
                    letterSpacing: "0.04em",
                    padding: "11px 20px",
                }}
            >
                {copy.csvFile}
            </div>
            <div style={{ fontSize: 15, lineHeight: "31px", padding: "10px 20px" }}>
                {copy.csvLines.map((line, i) => (
                    <div key={line} style={{ display: "flex", gap: 18, whiteSpace: "nowrap" }}>
                        <span style={{ color: theme.muted, opacity: 0.6 }}>{i + 1}</span>
                        <span>{line}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const SCRAPS: readonly Scrap[] = [
    {
        chaos: { r: 7, x: 250, y: -305, z: -40 },
        entry: () => ({ amount: "Bs.486,000.00", logo: "banesco", sub: "VES", title: "Banesco" }),
        id: "banesco",
        radius: 28,
        size: { h: 186, w: 360 },
        slot: 0,
        visual: () => <BanescoBalance />,
    },
    {
        chaos: { r: 9, x: 285, y: 300, z: -60 },
        entry: (copy) => ({ amount: "$220.00", logo: "cash", sub: "USD", title: copy.cash }),
        id: "cash",
        radius: 6,
        size: { h: 180, w: 290 },
        slot: 1,
        visual: () => <Envelope />,
    },
    {
        chaos: { r: -10, x: -250, y: -95, z: 40 },
        entry: (copy) => ({ amount: "−$42.00", logo: "costco", sub: `${copy.groceries} · Chase`, title: "Costco" }),
        id: "receipt",
        radius: 2,
        size: { h: RECEIPT_SIZE.height, w: RECEIPT_SIZE.width },
        slot: 2,
        visual: () => <Receipt />,
    },
    {
        chaos: { r: -5, x: -130, y: 250, z: -140 },
        entry: (copy) => ({ amount: "−$85.00", logo: "verizon", sub: `${copy.utilities} · Chase`, title: "Verizon" }),
        id: "csv",
        radius: 14,
        size: { h: 196, w: 520 },
        slot: 3,
        visual: () => <Csv />,
    },
    {
        chaos: { r: -6, x: 200, y: 85, z: 10 },
        entry: (copy) => ({
            amount: "−$139.00",
            logo: "amazon",
            sub: `${copy.subscriptions} · Amex Gold`,
            title: "Amazon Prime",
        }),
        id: "amazon",
        radius: 18,
        size: { h: 168, w: 420 },
        slot: 4,
        visual: () => <Amazon />,
    },
    {
        chaos: { r: -3.5, x: 40, y: -160, z: 140 },
        entry: (copy) => ({
            amount: "−$22.99",
            logo: "netflix",
            sub: `${copy.subscriptions} · Apple Card`,
            title: "Netflix",
        }),
        id: "netflix",
        radius: 34,
        size: { h: 128, w: 470 },
        slot: 5,
        visual: () => <Netflix />,
    },
    {
        chaos: { r: 5, x: -60, y: -365, z: 80 },
        entry: (copy) => ({
            amount: "−$11.99",
            logo: "spotify",
            sub: `${copy.subscriptions} · Apple Card`,
            title: "Spotify",
        }),
        id: "spotify",
        radius: 22,
        size: { h: 104, w: 450 },
        slot: 6,
        visual: () => <Spotify />,
    },
];

const slotTop = (slot: number) =>
    slot < 2 ? ACCOUNT_ROWS_TOP + slot * ROW.height : WEEK_ROWS_TOP + (slot - 2) * ROW.height;

const landing = (slot: number, t: number) =>
    ramp(t, SNAP + slot * 0.075, 1) * (1 - ramp(t, LOOSEN + (SCRAPS.length - 1 - slot) * 0.07, 1.7, GLIDE));

const WEEK_SPEND = [42, 85, 139, 22.99, 11.99];

function ScrapLayer({ scrap, t, panelTop, spreadY }: { panelTop: number; scrap: Scrap; spreadY: number; t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const { width } = useVideoConfig();
    const i = scrap.slot;
    const p = landing(i, t);
    const travel = p ** 1.6;
    const loose = 1 - p;
    const phase = i * 1.37;
    const chaosX = width / 2 + scrap.chaos.x + 16 * wave(t, CHAOS_SECONDS, phase);
    const chaosY = panelTop + PANEL.height / 2 + scrap.chaos.y * spreadY + 12 * wave(t, CHAOS_SECONDS / 2, phase * 1.7);
    const rowX = width / 2;
    const rowY = panelTop + slotTop(scrap.slot) + ROW.height / 2;
    const q = band(p, 0.05, 0.85);
    const w = mix(scrap.size.w, ROW.width, q);
    const h = mix(scrap.size.h, ROW.height, q);
    const visualOpacity = 1 - band(p, 0.08, 0.5);
    const rowOpacity = band(p, 0.42, 0.92);
    const rotation = loose * (scrap.chaos.r + 1.8 * wave(t, CHAOS_SECONDS, phase + 0.8));
    const radius = mix(scrap.radius, 16, q);
    return (
        <div
            style={{
                height: h,
                left: 0,
                position: "absolute",
                top: 0,
                transform: `translate3d(${mix(chaosX, rowX, travel) - w / 2}px, ${mix(chaosY, rowY, travel) - h / 2}px, ${loose * scrap.chaos.z}px) rotate(${rotation}deg) scale(${mix(1.12, 1, q)})`,
                width: w,
            }}
        >
            {visualOpacity > 0 ? (
                <div
                    style={{
                        borderRadius: radius,
                        boxShadow: theme.shadow,
                        inset: 0,
                        opacity: visualOpacity,
                        position: "absolute",
                    }}
                />
            ) : null}
            <div style={{ borderRadius: radius, inset: 0, overflow: "hidden", position: "absolute" }}>
                {visualOpacity > 0 ? (
                    <div
                        style={{
                            filter: visualOpacity < 1 ? `blur(${(1 - visualOpacity) * 10}px)` : undefined,
                            height: scrap.size.h,
                            left: (w - scrap.size.w) / 2,
                            opacity: visualOpacity,
                            position: "absolute",
                            top: (h - scrap.size.h) / 2,
                            width: scrap.size.w,
                        }}
                    >
                        {scrap.visual()}
                    </div>
                ) : null}
                {rowOpacity > 0 ? (
                    <EntryRow
                        entry={scrap.entry(copy)}
                        height={ROW.height}
                        style={{
                            filter: rowOpacity < 1 ? `blur(${(1 - rowOpacity) * 8}px)` : undefined,
                            left: (w - ROW.width) / 2,
                            opacity: rowOpacity,
                            position: "absolute",
                            top: (h - ROW.height) / 2,
                            width: ROW.width,
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}

function LedgerChrome({ panelTop, progress, t }: { panelTop: number; progress: number; t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const week = WEEK_SPEND.reduce((sum, spend, i) => sum + spend * landing(i + 2, t), 0);
    const { width } = useVideoConfig();
    const left = (width - PANEL.width) / 2;
    const inner = { left: left + (PANEL.width - ROW.width) / 2, position: "absolute", width: ROW.width } as const;
    return (
        <>
            <div
                style={{
                    background: theme.bg,
                    borderRadius: 44,
                    boxShadow: theme.shadow,
                    height: PANEL.height,
                    left,
                    opacity: progress,
                    position: "absolute",
                    scale: String(mix(0.94, 1, progress)),
                    top: panelTop,
                    width: PANEL.width,
                }}
            />
            <RuledHeader
                left={copy.accounts}
                right="USD · VES"
                style={{ ...inner, height: HEADER, opacity: band(progress, 0.4, 1), top: panelTop + 40 }}
            />
            <RuledHeader
                left={copy.week}
                right={formatMoney(-week)}
                style={{ ...inner, height: HEADER, opacity: band(progress, 0.5, 1), top: panelTop + WEEK_HEADER_TOP }}
            />
            {[1, 3, 4, 5, 6].map((slot) => (
                <div
                    key={slot}
                    style={{
                        ...inner,
                        borderTop: `1.5px solid ${theme.rule}`,
                        left: inner.left + 86,
                        opacity: band(progress, 0.7, 1),
                        top: panelTop + slotTop(slot),
                        width: ROW.width - 86,
                    }}
                />
            ))}
        </>
    );
}

function Scene() {
    const t = useSeconds();
    const { height, width } = useVideoConfig();
    const panelTop = (height - PANEL.height) / 2;
    const spreadY = Math.min(1.45, height / width);
    const progress = ramp(t, SNAP + 0.2, 1.1) * (1 - ramp(t, LOOSEN, 1.6, GLIDE));
    const tiltX = mix(13, 0, progress) + 1.4 * wave(t, CHAOS_SECONDS, 0.6);
    const tiltY = mix(-11, 0, progress) + 2 * wave(t, CHAOS_SECONDS, 2.1);
    const camera = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${mix(0.98, 1, progress)})`;
    return (
        <AbsoluteFill style={{ perspective: 2200 }}>
            <AbsoluteFill style={{ transform: camera }}>
                <LedgerChrome panelTop={panelTop} progress={progress} t={t} />
            </AbsoluteFill>
            <AbsoluteFill style={{ transform: camera, transformStyle: "preserve-3d" }}>
                {SCRAPS.map((scrap) => (
                    <ScrapLayer key={scrap.id} panelTop={panelTop} scrap={scrap} spreadY={spreadY} t={t} />
                ))}
            </AbsoluteFill>
        </AbsoluteFill>
    );
}

export function Chaos({ locale, mode }: FilmProps) {
    return (
        <Film locale={locale} mode={mode}>
            <Scene />
        </Film>
    );
}
