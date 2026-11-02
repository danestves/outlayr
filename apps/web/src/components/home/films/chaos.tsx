import type { ComponentType } from "react";
import { useIntlayer } from "react-intlayer";

import type { Act } from "@/stageshow/act";
import { Count } from "@/stageshow/motion/Count";
import { Stage } from "@/stageshow/stage";

import { formatMoney, Logo, loopBack, Micro, Ruled } from "./parts";
import type { LogoName } from "./parts";

import "./chaos.css";

interface Scene {
    out: boolean;
    step: number;
}

const START: Scene = { out: false, step: 0 };
const END: Scene = { out: false, step: 3 };

const script = async (act: Act<Scene>) => {
    await act.wait(250);
    act.put({ step: 1 });
    await act.wait(3100);
    act.put({ step: 2 });
    await act.wait(1400);
    act.put({ step: 3 });
    await loopBack(act, { out: true }, START);
};

const WEEK_SPENT = 42 + 85 + 139 + 22.99 + 11.99;
const ACCOUNTS = 2;

const GEOMETRY = {
    compact: {
        gap: 10,
        head: 26,
        height: 500,
        logo: 32,
        pad: 20,
        padTop: 22,
        panel: 16,
        row: 48,
        rowGap: 12,
        top: 16,
        width: 358,
    },
    wide: {
        gap: 14,
        head: 28,
        height: 560,
        logo: 36,
        pad: 28,
        padTop: 26,
        panel: 44,
        row: 56,
        rowGap: 14,
        top: 36,
        width: 664,
    },
} as const;

type Geometry = (typeof GEOMETRY)[keyof typeof GEOMETRY];

const slotTop = (g: Geometry, slot: number) =>
    g.top +
    g.padTop +
    g.head +
    (slot < ACCOUNTS ? slot * g.row : ACCOUNTS * g.row + g.gap + g.head + (slot - ACCOUNTS) * g.row);

const RECEIPT = { height: 369, width: 258 } as const;
const RECEIPT_PRICES = ["8.99", "1.99", "11.49", "6.49", "4.99", "5.49"] as const;

const jagged = (width: number, height: number, tooth: number) => {
    const count = Math.round(width / tooth);
    const top = Array.from({ length: count + 1 }, (_, i) => `${(i * width) / count}px ${i % 2 === 0 ? 0 : 4}px`);
    const bottom = Array.from(
        { length: count + 1 },
        (_, i) => `${((count - i) * width) / count}px ${height - (i % 2 === 0 ? 0 : 5)}px`
    );
    return `polygon(${[...top, ...bottom].join(", ")})`;
};

const RECEIPT_EDGE = jagged(RECEIPT.width, RECEIPT.height, 7);

function Mark({ name, size }: { name: LogoName; size: number }) {
    return (
        <span className="chaos-mark" style={{ height: size, width: size }}>
            <img alt="" className="light-only" height={size} src={`/films/logos/${name}.webp`} width={size} />
            <img alt="" className="dark-only" height={size} src={`/films/logos/${name}-dark.webp`} width={size} />
        </span>
    );
}

function Banesco() {
    return (
        <div className="chaos-card chaos-banesco">
            <div className="chaos-head-row">
                <Mark name="banesco" size={32} />
                <div className="chaos-stack">
                    <b className="chaos-name">Banesco</b>
                    <span className="chaos-sub">Cuenta corriente ••7731</span>
                </div>
            </div>
            <span className="chaos-sub">Saldo disponible</span>
            <b className="chaos-balance">Bs.486,000.00</b>
        </div>
    );
}

function Envelope() {
    const copy = useIntlayer("film-chaos");
    return (
        <div className="chaos-envelope">
            <svg aria-hidden height="100%" viewBox="0 0 290 180" width="100%">
                <path d="M0 0 145 92 290 0" fill="none" stroke="rgb(0 0 0 / 0.14)" strokeWidth="1.5" />
                <path d="M0 180 112 74M290 180 178 74" fill="none" stroke="rgb(0 0 0 / 0.08)" strokeWidth="1.5" />
            </svg>
            <span className="chaos-envelope__label">{copy.envelope}</span>
            <b className="chaos-envelope__amount">$220</b>
        </div>
    );
}

function Receipt() {
    const copy = useIntlayer("film-chaos");
    const items = copy.receiptItems.value.split("|");
    return (
        <div className="chaos-receipt">
            <div className="chaos-receipt__paper" style={{ clipPath: RECEIPT_EDGE }}>
                <div className="chaos-receipt__name">COSTCO</div>
                <div className="chaos-receipt__small chaos-receipt__wide">WHOLESALE</div>
                <div className="chaos-receipt__small">#1157 BROOKLYN NY</div>
                <hr />
                {items.map((item, index) => (
                    <div className="chaos-receipt__line" key={item}>
                        <span>{item}</span>
                        <span>{RECEIPT_PRICES[index]}</span>
                    </div>
                ))}
                <hr />
                <div className="chaos-receipt__line">
                    <span>SUBTOTAL</span>
                    <span>39.44</span>
                </div>
                <div className="chaos-receipt__line">
                    <span>{copy.receiptTax}</span>
                    <span>2.56</span>
                </div>
                <div className="chaos-receipt__line chaos-receipt__total">
                    <span>TOTAL</span>
                    <span>42.00</span>
                </div>
                <div className="chaos-receipt__line">
                    <span>{copy.receiptAccount}</span>
                    <span>****4417</span>
                </div>
                <div className="chaos-receipt__line">
                    <span>{copy.receiptDate}</span>
                    <span>14:32</span>
                </div>
            </div>
        </div>
    );
}

function Csv() {
    const copy = useIntlayer("film-chaos");
    const lines = copy.csv.value.split("\n");
    return (
        <div className="chaos-card chaos-csv">
            <div className="chaos-csv__file">{copy.csvFile}</div>
            <div className="chaos-csv__lines">
                {lines.map((line, index) => (
                    <div key={line}>
                        <span>{index + 1}</span>
                        <span>{line}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Amazon() {
    const copy = useIntlayer("film-chaos");
    return (
        <div className="chaos-card chaos-amazon">
            <div className="chaos-head-row">
                <Mark name="amazon" size={26} />
                <b className="chaos-name">Amazon.com</b>
                <span className="chaos-sub">{copy.amazonDate}</span>
            </div>
            <b className="chaos-title">{copy.amazonTitle}</b>
            <span className="chaos-sub">$139.00 · Amex Gold ••1009</span>
            <span className="chaos-order">{copy.amazonOrder} #112-4417203-5521</span>
        </div>
    );
}

function Netflix() {
    const copy = useIntlayer("film-chaos");
    return (
        <div className="chaos-card chaos-netflix">
            <Mark name="netflix" size={36} />
            <div className="chaos-stack">
                <div className="chaos-between">
                    <b className="chaos-brand">NETFLIX</b>
                    <span className="chaos-sub">{copy.now}</span>
                </div>
                <b className="chaos-title">{copy.netflixTitle}</b>
                <span className="chaos-sub">{copy.netflixBody}</span>
            </div>
        </div>
    );
}

function Spotify() {
    const copy = useIntlayer("film-chaos");
    return (
        <div className="chaos-card chaos-spotify">
            <Mark name="spotify" size={38} />
            <div className="chaos-stack">
                <b className="chaos-brand chaos-brand--strong">SPOTIFY USA</b>
                <span className="chaos-sub">{copy.pending} · Apple Card</span>
            </div>
            <b className="chaos-amount">$11.99</b>
        </div>
    );
}

interface Pose {
    k: number;
    r: number;
    x: number;
    y: number;
    z: number;
}

interface Scrap {
    Art: ComponentType;
    arrive: number;
    id: string;
    poses: { compact: Pose; wide: Pose };
    radius: number;
    size: { h: number; w: number };
    slot: number;
}

const SCRAPS: readonly Scrap[] = [
    {
        Art: Banesco,
        arrive: 5,
        id: "banesco",
        poses: {
            compact: { k: 0.64, r: 7, x: 262, y: 98, z: -30 },
            wide: { k: 0.88, r: 7, x: 520, y: 80, z: -30 },
        },
        radius: 20,
        size: { h: 140, w: 270 },
        slot: 0,
    },
    {
        Art: Envelope,
        arrive: 4,
        id: "cash",
        poses: {
            compact: { k: 0.64, r: 9, x: 276, y: 366, z: 40 },
            wide: { k: 0.88, r: 9, x: 528, y: 436, z: -40 },
        },
        radius: 5,
        size: { h: 136, w: 220 },
        slot: 1,
    },
    {
        Art: Receipt,
        arrive: 0,
        id: "receipt",
        poses: {
            compact: { k: 0.64, r: -9, x: 86, y: 338, z: 0 },
            wide: { k: 0.88, r: -9, x: 140, y: 305, z: 0 },
        },
        radius: 2,
        size: { h: RECEIPT.height, w: RECEIPT.width },
        slot: 2,
    },
    {
        Art: Csv,
        arrive: 1,
        id: "csv",
        poses: {
            compact: { k: 0.64, r: -5, x: 176, y: 432, z: 20 },
            wide: { k: 0.88, r: -5, x: 282, y: 466, z: 20 },
        },
        radius: 10,
        size: { h: 130, w: 340 },
        slot: 3,
    },
    {
        Art: Amazon,
        arrive: 2,
        id: "amazon",
        poses: {
            compact: { k: 0.64, r: -6, x: 258, y: 268, z: 10 },
            wide: { k: 0.88, r: -6, x: 478, y: 290, z: 10 },
        },
        radius: 14,
        size: { h: 122, w: 306 },
        slot: 4,
    },
    {
        Art: Netflix,
        arrive: 3,
        id: "netflix",
        poses: {
            compact: { k: 0.64, r: -3.5, x: 166, y: 210, z: 100 },
            wide: { k: 0.88, r: -3.5, x: 374, y: 202, z: 100 },
        },
        radius: 24,
        size: { h: 92, w: 343 },
        slot: 5,
    },
    {
        Art: Spotify,
        arrive: 6,
        id: "spotify",
        poses: {
            compact: { k: 0.64, r: 4, x: 122, y: 54, z: 60 },
            wide: { k: 0.88, r: 4, x: 262, y: 74, z: 60 },
        },
        radius: 16,
        size: { h: 76, w: 330 },
        slot: 6,
    },
];

export function ChaosFilm() {
    const copy = useIntlayer("film-chaos");
    const rows = [
        { amount: "Bs.486,000.00", logo: "banesco", sub: "VES", title: "Banesco" },
        { amount: "$220.00", logo: "cash", sub: "USD", title: copy.cash.value },
        { amount: "−$42.00", logo: "costco", sub: `${copy.groceries.value} · Chase`, title: "Costco" },
        { amount: "−$85.00", logo: "verizon", sub: `${copy.utilities.value} · Chase`, title: "Verizon" },
        { amount: "−$139.00", logo: "amazon", sub: `${copy.subscriptions.value} · Amex Gold`, title: "Amazon Prime" },
        { amount: "−$22.99", logo: "netflix", sub: `${copy.subscriptions.value} · Apple Card`, title: "Netflix" },
        { amount: "−$11.99", logo: "spotify", sub: `${copy.subscriptions.value} · Apple Card`, title: "Spotify" },
    ] as const satisfies readonly { amount: string; logo: LogoName; sub: string; title: string }[];
    return (
        <Stage<Scene>
            compact={{ below: 520, height: GEOMETRY.compact.height, width: GEOMETRY.compact.width }}
            height={GEOMETRY.wide.height}
            initial={START}
            play="loop"
            poster={END}
            script={script}
            width={GEOMETRY.wide.width}
        >
            {({ out, step }, _rect, layout) => {
                const g = GEOMETRY[layout];
                const rowWidth = g.width - 2 * (g.panel + g.pad);
                const done = step >= 3 || undefined;
                return (
                    <div className="film-scene" data-out={out || undefined}>
                        <div
                            className="chaos"
                            data-arrived={step >= 1 || undefined}
                            data-done={done}
                            data-layout={layout}
                            data-sorted={step >= 2 || undefined}
                            style={{
                                "--gap": `${g.gap}px`,
                                "--head": `${g.head}px`,
                                "--logo": `${g.logo}px`,
                                "--pad": `${g.pad}px`,
                                "--pad-top": `${g.padTop}px`,
                                "--panel-top": `${g.top}px`,
                                "--panel-x": `${g.panel}px`,
                                "--row-gap": `${g.rowGap}px`,
                                "--row-h": `${g.row}px`,
                                "--row-w": `${rowWidth}px`,
                            }}
                        >
                            <div className="chaos-panel film-panel">
                                <div className="chaos-head film-rise" data-in={done}>
                                    <Ruled left={copy.accounts} right="USD · VES" />
                                </div>
                                <div className="chaos-slots">
                                    {rows.slice(0, ACCOUNTS).map((row) => (
                                        <div className="chaos-slot" key={row.logo} />
                                    ))}
                                </div>
                                <div
                                    className="chaos-head chaos-head--week film-rise"
                                    data-in={done}
                                    style={{ "--i": 1 }}
                                >
                                    <Ruled
                                        left={copy.week}
                                        right={
                                            <Micro>
                                                <Count
                                                    duration={900}
                                                    format={(value) => `−${formatMoney(value)}`}
                                                    value={done ? WEEK_SPENT : 0}
                                                />
                                            </Micro>
                                        }
                                    />
                                </div>
                                <div className="chaos-slots">
                                    {rows.slice(ACCOUNTS).map((row) => (
                                        <div className="chaos-slot" key={row.logo} />
                                    ))}
                                </div>
                            </div>
                            <div className="chaos-camera">
                                <div className="chaos-pile">
                                    {SCRAPS.map(({ Art, arrive, id, poses, radius, size, slot }) => {
                                        const pose = poses[layout];
                                        const row = rows[slot];
                                        return (
                                            <div
                                                className="chaos-scrap"
                                                key={id}
                                                style={{
                                                    "--cr": `${pose.r}deg`,
                                                    "--cx": `${pose.x - rowWidth / 2}px`,
                                                    "--cy": `${pose.y - g.row / 2}px`,
                                                    "--cz": `${pose.z}px`,
                                                    "--h": `${size.h}px`,
                                                    "--k": pose.k,
                                                    "--n": arrive,
                                                    "--r": `${radius}px`,
                                                    "--rx": `${g.panel + g.pad}px`,
                                                    "--ry": `${slotTop(g, slot)}px`,
                                                    "--slot": slot,
                                                    "--w": `${size.w}px`,
                                                }}
                                            >
                                                <div className="chaos-arrive">
                                                    <div className="chaos-art">
                                                        <Art />
                                                    </div>
                                                    {row === undefined ? null : (
                                                        <div className="chaos-row">
                                                            <Logo name={row.logo} size={g.logo} />
                                                            <div className="chaos-stack">
                                                                <b className="chaos-row__title">{row.title}</b>
                                                                <span className="chaos-row__sub">{row.sub}</span>
                                                            </div>
                                                            <span className="chaos-row__amount">{row.amount}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }}
        </Stage>
    );
}
