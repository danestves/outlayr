import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

import {
    BigMoney,
    CategoryTile,
    COSTCO,
    EntryRow,
    Film,
    formatMoney,
    Icon,
    Logo,
    Micro,
    Panel,
    reveal,
    RuledHeader,
    useSeconds,
} from "./kit";
import type { LogoName } from "./kit";
import { band, GLIDE, mix, ramp, useLocale, useTheme, wave } from "./theme";
import type { FilmProps, Locale } from "./theme";

export const SORTED_SECONDS = 12;

const PANEL_WIDTH = 740;
const SPACING = 900;
const PAD = { x: 44, y: 38 };
const HEADER = 34;
const ROW = 74;
const CHIP = { height: 104, width: 660 };
const PANEL_TOP = 178;
const MOVE_SECONDS = 1.2;
const LAND = { budget: 4.35, chase: 1.45 };
const DROP_SECONDS = 0.7;

const EN = {
    accounts: "8 accounts",
    aDay: "A day",
    cash: "Cash",
    daysLeft: "18d left",
    groceries: "Groceries",
    left: "left this month",
    limit: "Limit",
    logged: "Logged today",
    months: { nov: "Nov", oct: "Oct", sep: "Sep" },
    of: "of",
    perMonth: "Per month",
    rent: "Rent",
    scope: "Everything · This month",
    spent: "Spent",
    transfer: "Transfer",
    upcoming: "Upcoming",
};

type Copy = typeof EN;

const COPY: Record<Locale, Copy> = {
    en: EN,
    es: {
        accounts: "8 cuentas",
        aDay: "Al día",
        cash: "Efectivo",
        daysLeft: "quedan 18d",
        groceries: "Súper",
        left: "disponible este mes",
        limit: "Límite",
        logged: "Registrado hoy",
        months: { nov: "nov", oct: "oct", sep: "sep" },
        of: "de",
        perMonth: "Al mes",
        rent: "Renta",
        scope: "Todo · Este mes",
        spent: "Gastado",
        transfer: "Transferencia",
        upcoming: "Próximos",
    },
};

const accountsFor = (copy: Copy): readonly { amount: number; currency: string; logo: LogoName; name: string }[] => [
    { amount: 12_480.32, currency: "USD", logo: "chase", name: "Chase" },
    { amount: 9450, currency: "USD", logo: "ally", name: "Ally Savings" },
    { amount: 3412.4, currency: "USD", logo: "zinli", name: "Zinli" },
    { amount: 486_000, currency: "VES", logo: "banesco", name: "Banesco" },
    { amount: 612.8, currency: "USD", logo: "paypal", name: "PayPal" },
    { amount: -842.15, currency: "USD", logo: "applecard", name: "Apple Card" },
    { amount: -1240.55, currency: "USD", logo: "amex", name: "Amex Gold" },
    { amount: 220, currency: "USD", logo: "cash", name: copy.cash },
];

const upcomingFor = (copy: Copy): readonly { amount: number; date: string; logo: LogoName; name: string }[] => [
    { amount: -139, date: `20 ${copy.months.nov}`, logo: "amazon", name: "Amazon Prime" },
    { amount: -20, date: `8 ${copy.months.oct}`, logo: "chatgpt", name: "ChatGPT" },
    { amount: -9.99, date: `6 ${copy.months.oct}`, logo: "icloud", name: "iCloud" },
    { amount: -85, date: `5 ${copy.months.oct}`, logo: "verizon", name: "Verizon" },
    { amount: -11.99, date: `3 ${copy.months.oct}`, logo: "spotify", name: "Spotify" },
    { amount: -1850, date: `1 ${copy.months.oct}`, logo: "rent", name: copy.rent },
    { amount: -22.99, date: `1 ${copy.months.oct}`, logo: "netflix", name: "Netflix" },
    { amount: -24.99, date: `15 ${copy.months.sep}`, logo: "planet", name: "Planet Fitness" },
];
const LOGGED = 4;

const CHASE_ROW_Y = PANEL_TOP + PAD.y + HEADER + 18 + ROW / 2;
const CHART = { height: 271, width: PANEL_WIDTH - 2 * PAD.x };
const GROCERIES_Y = PANEL_TOP + PAD.y + HEADER + 12 + 112 + 50 + CHART.height + 26 + 92 + 30 + 34;

const CHASE_TARGET = { x: 197, y: CHASE_ROW_Y };
const GROCERY_TARGET = { x: SPACING + PANEL_WIDTH / 2 - PAD.x - 120, y: GROCERIES_Y - 16 };

const dropProgress = (t: number, at: number) => ramp(t, at + DROP_SECONDS * 0.85, 0.8);

function AccountsPanel({ t, left }: { left: number; t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const accounts = accountsFor(copy);
    const landed = dropProgress(t, LAND.chase);
    const glow = band(t, LAND.chase + 0.5, LAND.chase + 0.8) * (1 - band(t, LAND.chase + 1.6, LAND.chase + 2.4));
    return (
        <Panel
            style={{ left, padding: `${PAD.y}px ${PAD.x}px`, position: "absolute", top: PANEL_TOP, width: PANEL_WIDTH }}
        >
            <div style={{ alignItems: "center", display: "flex", height: HEADER, justifyContent: "space-between" }}>
                <Micro>{copy.accounts}</Micro>
            </div>
            <div style={{ background: theme.surface, borderRadius: 28, marginTop: 18, padding: "0 26px" }}>
                {accounts.map((account, i) => {
                    const amount = i === 0 ? account.amount + 42 * (1 - landed) : account.amount;
                    return (
                        <div
                            key={account.name}
                            style={{
                                alignItems: "center",
                                borderBottom: i < accounts.length - 1 ? `1.5px solid ${theme.rule}` : undefined,
                                display: "flex",
                                gap: 18,
                                height: ROW,
                                position: "relative",
                            }}
                        >
                            {i === 0 ? (
                                <div
                                    style={{
                                        background: theme.tintWash,
                                        borderRadius: 16,
                                        inset: "6px -14px",
                                        opacity: glow,
                                        position: "absolute",
                                    }}
                                />
                            ) : null}
                            <Logo name={account.logo} size={60} />
                            <div style={{ display: "flex", flex: 1, flexDirection: "column", position: "relative" }}>
                                <span style={{ fontSize: 25, fontWeight: 500, lineHeight: 1.2 }}>{account.name}</span>
                                <span style={{ color: theme.muted, fontSize: 15, letterSpacing: "0.04em" }}>
                                    {account.currency}
                                </span>
                            </div>
                            <span
                                style={{
                                    color:
                                        i === 0 && glow > 0
                                            ? `color-mix(in srgb, ${theme.tint} ${glow * 100}%, ${theme.fg})`
                                            : theme.fg,
                                    fontSize: 25,
                                    position: "relative",
                                }}
                            >
                                {formatMoney(amount, { symbol: account.currency === "VES" ? "Bs." : "$" })}
                            </span>
                            <Icon color={theme.muted} name="chevron" size={22} />
                        </div>
                    );
                })}
            </div>
            <div
                style={{
                    alignItems: "center",
                    background: theme.surface,
                    borderRadius: 28,
                    color: theme.tint,
                    display: "flex",
                    fontSize: 24,
                    gap: 12,
                    height: 66,
                    marginTop: 16,
                    padding: "0 26px",
                }}
            >
                <Icon color={theme.tint} name="transfer" size={28} />
                {copy.transfer}
            </div>
        </Panel>
    );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Micro style={{ fontSize: 17 }}>{label}</Micro>
            <b style={{ fontSize: 28, fontWeight: 600 }}>{value}</b>
        </div>
    );
}

function BudgetPanel({ t, left }: { left: number; t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const landed = dropProgress(t, LAND.budget);
    const draw = ramp(t, 3.5, 1.6, GLIDE);
    const later = ramp(t, 4.7, 0.7);
    const grocery = mix(208.89, 250.89, landed);
    const ruled: CSSProperties = { borderLeft: `1.5px solid ${theme.rule}`, paddingLeft: 22 };
    return (
        <Panel
            style={{ left, padding: `${PAD.y}px ${PAD.x}px`, position: "absolute", top: PANEL_TOP, width: PANEL_WIDTH }}
        >
            <div style={{ alignItems: "center", display: "flex", height: HEADER, justifyContent: "space-between" }}>
                <Micro>{copy.scope}</Micro>
                <Micro>{copy.daysLeft}</Micro>
            </div>
            <div style={{ height: 112, marginTop: 12 }}>
                <BigMoney size={112} value={mix(1060.59, 1018.59, landed)} />
            </div>
            <div style={{ color: theme.muted, fontSize: 22, height: 50, paddingTop: 10 }}>{copy.left}</div>
            <svg
                height={CHART.height}
                style={{ display: "block", overflow: "visible" }}
                viewBox="0 0 400 166"
                width={CHART.width}
            >
                <path
                    d="M0 10V76H13V80H27V84H40V86H53V90H67V93H80V97H93V99H107V104H120V107H133V110H147V113H160V150H0Z"
                    fill={theme.fill}
                    opacity={later}
                />
                <line
                    stroke={theme.muted}
                    strokeDasharray="0.6 3.4"
                    strokeLinecap="round"
                    strokeWidth="1"
                    x1="0"
                    x2="400"
                    y1="10"
                    y2="150"
                />
                <line stroke={theme.fg} strokeWidth="1" x1="0" x2="400" y1="150" y2="150" />
                <line opacity={0.6 * later} stroke={theme.muted} strokeWidth="0.7" x1="160" x2="160" y1="0" y2="166" />
                <path
                    d="M0 10V76H13V80H27V84H40V86H53V90H67V93H80V97H93V99H107V104H120V107H133V110H147V113H160"
                    fill="none"
                    pathLength={1}
                    stroke={theme.fg}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - draw}
                    strokeWidth="1.5"
                />
                <line
                    opacity={later}
                    stroke={theme.tint}
                    strokeDasharray="3.5 2.6"
                    strokeWidth="1.1"
                    x1="160"
                    x2={mix(160, 400, ramp(t, 4.8, 1))}
                    y1="113"
                    y2={mix(113, 161.5, ramp(t, 4.8, 1))}
                />
                <circle cx="160" cy="113" fill={theme.fg} opacity={band(draw, 0.9, 1)} r="3" />
            </svg>
            <div
                style={{
                    borderTop: `1.5px solid ${theme.rule}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    height: 92,
                    marginTop: 26,
                    paddingTop: 16,
                }}
            >
                <Stat label={copy.limit} value="$3,900" />
                <div style={ruled}>
                    <Stat
                        label={copy.spent}
                        value={`$${Math.round(mix(2839, 2881, landed)).toLocaleString("en-US")}`}
                    />
                </div>
                <div style={ruled}>
                    <Stat label={copy.aDay} value="$57" />
                </div>
            </div>
            <div style={{ alignItems: "center", display: "flex", gap: 18, height: 64, marginTop: 30 }}>
                <CategoryTile category="groceries" size={52} />
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 10 }}>
                    <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 25, fontWeight: 500 }}>{copy.groceries}</span>
                        <span style={{ color: theme.muted, fontSize: 21 }}>
                            <span style={{ color: landed > 0 && landed < 1 ? theme.tint : theme.fg }}>
                                {formatMoney(grocery)}
                            </span>{" "}
                            {copy.of} $300
                        </span>
                    </div>
                    <div style={{ background: theme.track, borderRadius: 4, height: 8, overflow: "hidden" }}>
                        <div
                            style={{
                                background: theme.groceries.ink,
                                borderRadius: 4,
                                height: "100%",
                                width: `${(grocery / 300) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function UpcomingPanel({ t, left }: { left: number; t: number }) {
    const theme = useTheme();
    const copy = COPY[useLocale()];
    const tick = ramp(t, 9.45, 0.6);
    return (
        <Panel
            style={{
                left,
                padding: `${PAD.y}px ${PAD.x}px`,
                position: "absolute",
                top: PANEL_TOP + 20,
                width: PANEL_WIDTH,
            }}
        >
            <RuledHeader left={copy.upcoming} right="−$2,163.96" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <Micro>{copy.perMonth}</Micro>
                <Micro>−$2,036.54</Micro>
            </div>
            <div style={{ marginTop: 10 }}>
                {upcomingFor(copy).map((item, i) => {
                    const shown = ramp(t, 7.95 + i * 0.075, 0.8);
                    const logged = i === LOGGED ? tick : 0;
                    return (
                        <div
                            key={item.name}
                            style={{
                                alignItems: "center",
                                display: "flex",
                                gap: 20,
                                height: ROW,
                                position: "relative",
                                ...reveal(shown, 26, 12),
                            }}
                        >
                            {i === LOGGED ? (
                                <div
                                    style={{
                                        background: theme.tintWash,
                                        borderRadius: 16,
                                        inset: "4px -16px",
                                        opacity: logged * (1 - ramp(t, 10.3, 0.6)),
                                        position: "absolute",
                                    }}
                                />
                            ) : null}
                            <div style={{ position: "relative" }}>
                                <Logo name={item.logo} size={64} />
                            </div>
                            <div style={{ display: "flex", flex: 1, flexDirection: "column", position: "relative" }}>
                                <span style={{ fontSize: 25, fontWeight: 500, lineHeight: 1.2 }}>{item.name}</span>
                                <span
                                    style={{
                                        color: theme.muted,
                                        fontSize: 15,
                                        height: 19,
                                        letterSpacing: "0.04em",
                                        position: "relative",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    <span style={{ opacity: 1 - logged, position: "absolute" }}>{item.date}</span>
                                    <span
                                        style={{
                                            color: theme.tint,
                                            opacity: logged,
                                            position: "absolute",
                                            translate: `0 ${(1 - logged) * 8}px`,
                                        }}
                                    >
                                        {copy.logged}
                                    </span>
                                </span>
                            </div>
                            {i === LOGGED ? (
                                <div
                                    style={{
                                        background: theme.tint,
                                        borderRadius: 15,
                                        display: "grid",
                                        height: 30,
                                        opacity: logged,
                                        placeItems: "center",
                                        position: "relative",
                                        scale: String(mix(0.4, 1, logged)),
                                        width: 30,
                                    }}
                                >
                                    <Icon color={theme.bg} name="check" size={20} stroke={2.4} />
                                </div>
                            ) : null}
                            <span
                                style={{
                                    color:
                                        logged > 0
                                            ? `color-mix(in srgb, ${theme.muted} ${logged * 100}%, ${theme.fg})`
                                            : theme.fg,
                                    fontSize: 25,
                                    opacity: 0.9,
                                    position: "relative",
                                }}
                            >
                                {formatMoney(item.amount)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

interface Point {
    x: number;
    y: number;
}
type Camera = Point & { zoom: number };

const OPENING: Camera = { x: 0, y: 500, zoom: 1.22 };
const MOVES: readonly { at: number; shot: Camera }[] = [
    { at: 2.7, shot: { x: SPACING, y: 556, zoom: 1.12 } },
    { at: 7.3, shot: { x: 2 * SPACING, y: 572, zoom: 1.17 } },
    { at: 10.6, shot: { ...OPENING, x: 3 * SPACING } },
];

const panelLeft = (index: number) => index * SPACING - PANEL_WIDTH / 2;

function Drop({ t, at, from, to }: { at: number; from: Point; t: number; to: Point }) {
    const theme = useTheme();
    const p = ramp(t, at, DROP_SECONDS, GLIDE);
    const fade = band(t, at + DROP_SECONDS * 0.75, at + DROP_SECONDS + 0.05);
    if (t < at || fade >= 1) {
        return null;
    }
    const lift = Math.sin(Math.PI * p) * 40;
    return (
        <div
            style={{
                background: theme.tintWash,
                borderRadius: 10,
                color: theme.tint,
                fontSize: 28,
                left: 0,
                lineHeight: "44px",
                opacity: band(p, 0, 0.15) * (1 - fade),
                padding: "0 12px",
                position: "absolute",
                top: 0,
                transform: `translate(${mix(from.x, to.x, p)}px, ${mix(from.y, to.y, p) - lift}px) translate(-50%, -50%) scale(${mix(1, 0.92, p)})`,
                whiteSpace: "nowrap",
            }}
        >
            −$42.00
        </div>
    );
}

function Scene() {
    const t = useSeconds();
    const theme = useTheme();
    const locale = useLocale();
    const { height, width } = useVideoConfig();
    let camera = OPENING;
    let swing = 0;
    for (const { at, shot } of MOVES) {
        const m = ramp(t, at, MOVE_SECONDS, GLIDE);
        camera = { x: mix(camera.x, shot.x, m), y: mix(camera.y, shot.y, m), zoom: mix(camera.zoom, shot.zoom, m) };
        swing += Math.sin(Math.PI * m);
    }
    const zoom = camera.zoom * (1 - 0.22 * swing);
    const focusY = camera.y + 8 * wave(t, SORTED_SECONDS, 0.4);
    const project = (point: Point) => ({
        x: width / 2 + (point.x - camera.x) * zoom,
        y: height / 2 + (point.y - focusY) * zoom,
    });
    const chipIn = ramp(t, 0.3, 0.9) * (1 - ramp(t, 7, 0.6, GLIDE));
    const chipLeft = (width - CHIP.width) / 2;
    const chipTop = height / 2 - 510;
    const chipAmount = { x: chipLeft + CHIP.width - 92, y: chipTop + CHIP.height / 2 };
    const tilt = `rotateX(${4 + 1.2 * wave(t, SORTED_SECONDS)}deg) rotateY(${-9 * swing + 2.2 * wave(t, SORTED_SECONDS, 1)}deg)`;
    return (
        <AbsoluteFill style={{ perspective: 2000 }}>
            <AbsoluteFill style={{ transform: tilt, transformStyle: "preserve-3d" }}>
                <div
                    style={{
                        left: 0,
                        position: "absolute",
                        top: 0,
                        transform: `translate(${width / 2 - camera.x * zoom}px, ${height / 2 - focusY * zoom}px) scale(${zoom})`,
                        transformOrigin: "0 0",
                    }}
                >
                    <AccountsPanel left={panelLeft(0)} t={t} />
                    <BudgetPanel left={panelLeft(1)} t={t} />
                    <UpcomingPanel left={panelLeft(2)} t={t} />
                    <AccountsPanel left={panelLeft(3)} t={t - SORTED_SECONDS} />
                </div>
            </AbsoluteFill>
            {chipIn > 0.001 ? (
                <AbsoluteFill style={{ transform: `${tilt} translateZ(60px)` }}>
                    <div
                        style={{
                            background: theme.bg,
                            borderRadius: 30,
                            boxShadow: theme.lift,
                            height: CHIP.height,
                            left: chipLeft,
                            padding: "0 30px 0 22px",
                            position: "absolute",
                            top: chipTop,
                            width: CHIP.width,
                            ...reveal(chipIn, -60, 18),
                        }}
                    >
                        <EntryRow entry={COSTCO[locale]} height={CHIP.height} />
                    </div>
                    <Drop at={LAND.chase} from={chipAmount} t={t} to={project(CHASE_TARGET)} />
                    <Drop at={LAND.budget} from={chipAmount} t={t} to={project(GROCERY_TARGET)} />
                </AbsoluteFill>
            ) : null}
        </AbsoluteFill>
    );
}

export function Sorted({ locale, mode }: FilmProps) {
    return (
        <Film locale={locale} mode={mode}>
            <Scene />
        </Film>
    );
}
