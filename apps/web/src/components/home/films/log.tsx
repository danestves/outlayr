import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { Act } from "@/stageshow/act";
import { Collapse } from "@/stageshow/motion/Collapse";
import { Count } from "@/stageshow/motion/Count";
import { Stage } from "@/stageshow/stage";

import { FilmIcon, formatMoney, Logo, loopBack, Micro } from "./parts";

import "./log.css";

const STEP = { amount: 2, dial: 1, idle: 0, logged: 5, name: 3, picked: 4 } as const;

interface Scene {
    amount: number;
    out: boolean;
    lit: boolean;
    step: number;
}

const START: Scene = { amount: 0, lit: false, out: false, step: STEP.idle };
const END: Scene = { amount: 42, lit: false, out: false, step: STEP.logged };

const REST = { x: 201, y: 440 };
const SPENT = 42;
const FIGURES = { accounts: 24_694.76, chase: 12_480.32, net: 3768.59, out: 2881.41 } as const;

const script = async (act: Act<Scene>) => {
    await act.wait(900);
    await act.click("fab");
    act.put({ step: STEP.dial });
    await act.wait(900);
    await act.click("dial-add");
    act.put({ step: STEP.amount });
    await act.wait(1000);
    await act.click("key-4");
    act.put({ amount: 4 });
    await act.click("key-2");
    act.put({ amount: SPENT });
    await act.wait(300);
    await act.click("cta");
    act.put({ step: STEP.name });
    await act.wait(900);
    await act.click("chip-costco");
    act.put({ step: STEP.picked });
    await act.wait(1300);
    await act.click("cta");
    act.put({ lit: true, step: STEP.logged });
    await act.wait(1800);
    act.put({ lit: false });
    await act.move(REST);
    await loopBack(act, { out: true }, START);
};

const GLYPHS = {
    search: [
        "M17 17L21 21",
        "M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z",
    ],
    calendar: [
        "M16 2V6M8 2V6",
        "M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z",
        "M3 10H21",
        "M12.1258 14H12.0008M12.1258 18H12.0008M7.625 14H7.5M7.625 18H7.5M16.625 14H16.5M12.2508 14C12.2508 14.1381 12.1389 14.25 12.0008 14.25C11.8628 14.25 11.7508 14.1381 11.7508 14C11.7508 13.8619 11.8628 13.75 12.0008 13.75C12.1389 13.75 12.2508 13.8619 12.2508 14ZM12.2508 18C12.2508 18.1381 12.1389 18.25 12.0008 18.25C11.8628 18.25 11.7508 18.1381 11.7508 18C11.7508 17.8619 11.8628 17.75 12.0008 17.75C12.1389 17.75 12.2508 17.8619 12.2508 18ZM7.75 14C7.75 14.1381 7.63807 14.25 7.5 14.25C7.36193 14.25 7.25 14.1381 7.25 14C7.25 13.8619 7.36193 13.75 7.5 13.75C7.63807 13.75 7.75 13.8619 7.75 14ZM7.75 18C7.75 18.1381 7.63807 18.25 7.5 18.25C7.36193 18.25 7.25 18.1381 7.25 18C7.25 17.8619 7.36193 17.75 7.5 17.75C7.63807 17.75 7.75 17.8619 7.75 18ZM16.75 14C16.75 14.1381 16.6381 14.25 16.5 14.25C16.3619 14.25 16.25 14.1381 16.25 14C16.25 13.8619 16.3619 13.75 16.5 13.75C16.6381 13.75 16.75 13.8619 16.75 14Z",
    ],
    filter: [
        "M3 7H6",
        "M3 17H9",
        "M18 17L21 17",
        "M15 7L21 7",
        "M6 7C6 6.06812 6 5.60218 6.15224 5.23463C6.35523 4.74458 6.74458 4.35523 7.23463 4.15224C7.60218 4 8.06812 4 9 4C9.93188 4 10.3978 4 10.7654 4.15224C11.2554 4.35523 11.6448 4.74458 11.8478 5.23463C12 5.60218 12 6.06812 12 7C12 7.93188 12 8.39782 11.8478 8.76537C11.6448 9.25542 11.2554 9.64477 10.7654 9.84776C10.3978 10 9.93188 10 9 10C8.06812 10 7.60218 10 7.23463 9.84776C6.74458 9.64477 6.35523 9.25542 6.15224 8.76537C6 8.39782 6 7.93188 6 7Z",
        "M12 17C12 16.0681 12 15.6022 12.1522 15.2346C12.3552 14.7446 12.7446 14.3552 13.2346 14.1522C13.6022 14 14.0681 14 15 14C15.9319 14 16.3978 14 16.7654 14.1522C17.2554 14.3552 17.6448 14.7446 17.8478 15.2346C18 15.6022 18 16.0681 18 17C18 17.9319 18 18.3978 17.8478 18.7654C17.6448 19.2554 17.2554 19.6448 16.7654 19.8478C16.3978 20 15.9319 20 15 20C14.0681 20 13.6022 20 13.2346 19.8478C12.7446 19.6448 12.3552 19.2554 12.1522 18.7654C12 18.3978 12 17.9319 12 17Z",
    ],
    plus: ["M12 4V20M20 12H4"],
    close: ["M18 6L6.00081 17.9992M17.9992 18L6 6.00085"],
    receipt: [
        "M12 7.5H13.5C14.3284 7.5 15 8.17157 15 9M12 7.5H10.5C9.67157 7.5 9 8.17157 9 9V9.5C9 10.3284 9.67157 11 10.5 11H13.5C14.3284 11 15 11.6716 15 12.5V13C15 13.8284 14.3284 14.5 13.5 14.5H12M12 7.5V6M12 14.5H10.5C9.67157 14.5 9 13.8284 9 13M12 14.5V16",
        "M10.94 21.5124L9.02913 20.3073C8.54415 20.0014 8.30166 19.8485 8.03253 19.8397C7.74172 19.8301 7.49493 19.9768 6.97087 20.3073C6.38395 20.6774 5.21687 21.6971 4.46195 21.2108C4 20.9133 4 20.1575 4 18.6458V8.00002C4 5.17158 4 3.75736 4.82699 2.87868C5.65399 2 6.98501 2 9.64706 2H14.3529C17.015 2 18.346 2 19.173 2.87868C20 3.75736 20 5.17158 20 8.00002V18.6458C20 20.1575 20 20.9133 19.538 21.2108C18.7831 21.6971 17.6161 20.6774 17.0291 20.3073C16.5441 20.0014 16.3017 19.8485 16.0325 19.8397C15.7417 19.8301 15.4949 19.9768 14.9709 20.3073L13.06 21.5124C12.5445 21.8374 12.2868 22 12 22C11.7132 22 11.4554 21.8374 10.94 21.5124Z",
    ],
    transfer: [
        "M19 9H6.65856C5.65277 9 5.14987 9 5.02472 8.69134C4.89957 8.38268 5.25517 8.01942 5.96637 7.29289L8.21091 5",
        "M5 15H17.3414C18.3472 15 18.8501 15 18.9753 15.3087C19.1004 15.6173 18.7448 15.9806 18.0336 16.7071L15.7891 19",
    ],
    mic: [
        "M7 6.5C7 4.01472 9.01472 2 11.5 2C13.9853 2 16 4.01472 16 6.5V11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5V6.5Z",
        "M11.5 19H11.0828C7.57267 19 4.57706 16.4623 4 13M11.5 19H11.9172C15.4273 19 18.4229 16.4623 19 13M11.5 19V22",
    ],
    scan: [
        "M16.0042 2.5C17.9974 2.61348 19.2576 2.93381 20.1619 3.83811C21.0662 4.74243 21.3865 6.00268 21.5 7.99598M7.99582 2.5C6.00261 2.61348 4.74241 2.93381 3.83812 3.83811C2.9338 4.74243 2.61347 6.00268 2.5 7.99598M21.5 16.004C21.3865 17.9973 21.0662 19.2576 20.1619 20.1619C19.2576 21.0662 17.9973 21.3865 16.004 21.5M2.5 16.004C2.61347 17.9973 2.9338 19.2576 3.83812 20.1619C4.74244 21.0662 6.00268 21.3865 7.99597 21.5",
        "M5 12H19",
    ],
    importFile: [
        "M20 15.0057V10.6606C20 9.84276 20 9.43383 19.8478 9.06613C19.6955 8.69843 19.4065 8.40927 18.8284 7.83096L14.0919 3.09236C13.593 2.59325 13.3436 2.3437 13.0345 2.19583C12.9702 2.16508 12.9044 2.13778 12.8372 2.11406C12.5141 2 12.1614 2 11.4558 2C8.21082 2 6.58831 2 5.48933 2.88646C5.26731 3.06554 5.06508 3.26787 4.88607 3.48998C4 4.58943 4 6.21265 4 9.45908V14.0052C4 17.7781 4 19.6645 5.17157 20.8366C6.11466 21.7801 7.52043 21.9641 10 22M13 2.50022V3.00043C13 5.83009 13 7.24492 13.8787 8.12398C14.7574 9.00304 16.1716 9.00304 19 9.00304H19.5",
        "M15 22C14.3932 21.4102 12 19.8403 12 19C12 18.1597 14.3932 16.5898 15 16M13 19H20",
    ],
    chevronDown: ["M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"],
    back: ["M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"],
    tick: ["M5 14L8.5 17.5L19 6.5"],
    backspace: ["M9.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9.5L3 12z", "M13 9.5l4 5M17 9.5l-4 5"],
    balances: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M12 7.5V12l3 2"],
    fee: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M9 15l6-6", "M9.2 9.2h.01M14.8 14.8h.01"],
    insights: [
        "M5.5 3.5h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z",
        "M8.5 16.5v-3.5M12 16.5V8M15.5 16.5v-5.5",
    ],
    note: ["M7 3.5h7.5L19 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z", "M9 12.5h6M9 16h4"],
    repeat: ["M17 3l4 4-4 4", "M3 11V9a3 3 0 0 1 3-3h15", "M7 21l-4-4 4-4", "M21 13v2a3 3 0 0 1-3 3H3"],
    settings: [
        "M12.2 2.5h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.1.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.1.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7v-.2a2 2 0 0 0-2-2z",
        "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
    ],
    sparkle: [
        "M10 4l1.7 4.8L16.5 10.5l-4.8 1.7L10 17l-1.7-4.8L3.5 10.5l4.8-1.7z",
        "M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
    ],
    split: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z", "M8 12h8", "M12 8.3h.01M12 15.7h.01"],
    swap: ["M8 20V4M8 4L5 7M8 4l3 3", "M16 4v16M16 20l-3-3M16 20l3-3"],
    tag: [
        "M3.5 11.6V5a1.5 1.5 0 0 1 1.5-1.5h6.6a1.5 1.5 0 0 1 1 .4l7.5 7.5a1.5 1.5 0 0 1 0 2.1l-6.5 6.5a1.5 1.5 0 0 1-2.1 0l-7.5-7.5a1.5 1.5 0 0 1-.5-1z",
        "M8 8h.01",
    ],
} as const satisfies Record<string, readonly string[]>;

type GlyphName = keyof typeof GLYPHS;

function Glyph({ name, size = 22, stroke = 1.8 }: { name: GlyphName; size?: number; stroke?: number }) {
    return (
        <svg
            aria-hidden
            fill="none"
            height={size}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke}
            style={{ display: "block", flexShrink: 0 }}
            viewBox="0 0 24 24"
            width={size}
        >
            {GLYPHS[name].map((d) => (
                <path d={d} key={d} />
            ))}
        </svg>
    );
}

const cents = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function Rolling({ prefix = "", value }: { prefix?: string; value: number }) {
    return <Count duration={900} format={(n) => `${prefix}$${cents(n)}`} value={value} />;
}

function StatusBar() {
    return (
        <div className="log-status">
            <span className="log-clock">9:41</span>
            <span className="log-status-icons">
                <svg aria-hidden height="12" viewBox="0 0 18 12" width="18">
                    <path
                        d="M1.5 12V8.5M6.5 12V6.5M11.5 12V4M16.5 12V1.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="3"
                    />
                </svg>
                <svg aria-hidden height="12" viewBox="0 0 16 12" width="16">
                    <path
                        d="M1 4.2a10 10 0 0 1 14 0M3.5 6.8a6.4 6.4 0 0 1 9 0M6 9.3a2.8 2.8 0 0 1 4 0"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.9"
                    />
                    <circle cx="8" cy="10.9" fill="currentColor" r="1.1" />
                </svg>
                <svg aria-hidden height="13" viewBox="0 0 28 13" width="28">
                    <rect
                        fill="none"
                        height="12"
                        opacity=".4"
                        rx="3.6"
                        stroke="currentColor"
                        width="24"
                        x=".5"
                        y=".5"
                    />
                    <rect fill="#34c759" height="8.4" rx="2.2" width="19.6" x="2.5" y="2.3" />
                    <path d="M26 4.4v4.2c.9-.3 1.6-1.2 1.6-2.1S26.9 4.7 26 4.4z" fill="currentColor" opacity=".45" />
                </svg>
            </span>
        </div>
    );
}

function Mark({ children, tone }: { children: ReactNode; tone: "pink" | "white" }) {
    return (
        <span className="log-mark" data-tone={tone}>
            {children}
        </span>
    );
}

const GITHUB =
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";
const SWOOSH =
    "M2 14.2c.7-1.7 2.2-2.4 3.9-1.6 1.8.9 4.1 1 6.9-.4 2.9-1.4 6.4-3.6 9.2-6-3 3.1-7.6 8.2-12.4 10.2-3.5 1.4-6.8 1.1-7.6-2.2z";

function Lead({ kind }: { kind: "github" | "lyft" | "nike" }) {
    if (kind === "lyft") {
        return (
            <Mark tone="pink">
                <b>lyft</b>
            </Mark>
        );
    }
    return (
        <Mark tone="white">
            <svg aria-hidden height="20" viewBox={kind === "github" ? "0 0 16 16" : "0 0 24 24"} width="20">
                <path d={kind === "github" ? GITHUB : SWOOSH} fill="currentColor" />
            </svg>
        </Mark>
    );
}

function Row({
    amount,
    lead,
    lit,
    name,
    sub,
}: {
    amount: ReactNode;
    lead: ReactNode;
    lit?: boolean;
    name: string;
    sub: ReactNode;
}) {
    return (
        <div className="log-row" data-lit={lit || undefined}>
            {lead}
            <span className="log-row-text">
                <span className="log-row-name">{name}</span>
                <span className="log-row-sub">{sub}</span>
            </span>
            <span className="log-row-amount">{amount}</span>
        </div>
    );
}

function Section({ label, total }: { label: ReactNode; total: ReactNode }) {
    return (
        <div className="log-section">
            <Micro>{label}</Micro>
            <span className="log-section-total">{total}</span>
        </div>
    );
}

function Body({ lit, step }: Scene) {
    const copy = useIntlayer("film-log");
    const logged = step >= STEP.logged;
    const spent = logged ? SPENT : 0;
    return (
        <div className="log-body" data-blur={step === STEP.dial || undefined}>
            <h2 className="log-title">{copy.title}</h2>
            <div className="log-net">
                <Micro>{copy.net}</Micro>
                <div className="log-net-value">
                    <span className="log-sign">+$</span>
                    <Count duration={900} format={cents} value={FIGURES.net - spent} />
                </div>
                <span className="log-currency">
                    USD
                    <Glyph name="chevronDown" size={10} stroke={2.4} />
                </span>
            </div>
            <div className="log-flow">
                <div>
                    <Micro>{copy.inLabel}</Micro>
                    <b className="log-in">+$6,650.00</b>
                </div>
                <div>
                    <Micro>{copy.outLabel}</Micro>
                    <b>
                        <Rolling prefix="−" value={FIGURES.out + spent} />
                    </b>
                </div>
            </div>
            <Section label={copy.accounts} total={<Rolling value={FIGURES.accounts - spent} />} />
            <Row
                amount={<Rolling value={FIGURES.chase - spent} />}
                lead={<Logo name="chase" size={34} />}
                name="Chase"
                sub="USD"
            />
            <Row amount="$9,450.00" lead={<Logo name="ally" size={34} />} name="Ally Savings" sub="USD" />
            <Row amount="$3,412.40" lead={<Logo name="zinli" size={34} />} name="Zinli" sub="USD" />
            <p className="log-more">
                <Micro style={{ color: "var(--film-tint)" }}>{copy.more}</Micro>
            </p>
            <Collapse open={logged}>
                <Section label={copy.today} total="−$42.00" />
                <Row
                    amount="−$42.00"
                    lead={<Logo name="costco" size={34} />}
                    lit={lit}
                    name="Costco"
                    sub={copy.nowTime}
                />
            </Collapse>
            <Section label={copy.friday} total="−$93.00" />
            <Row amount="−$4.00" lead={<Lead kind="github" />} name="GitHub" sub={copy.timeLate} />
            <Row amount="−$89.00" lead={<Lead kind="nike" />} name="Nike" sub={copy.timeEarly} />
            <Section label={copy.thursday} total="−$17.80" />
            <Row amount="−$17.80" lead={<Lead kind="lyft" />} name="Lyft" sub={copy.timeNight} />
        </div>
    );
}

function TabBar() {
    const copy = useIntlayer("film-log");
    return (
        <div className="log-tabs">
            <span className="log-tab" data-on>
                <svg aria-hidden height="24" viewBox="0 0 24 24" width="24">
                    <rect fill="currentColor" height="19" rx="3.2" width="14.5" x="3" y="2.5" />
                    <path
                        d="M6.6 8h7.3M6.6 12h4.2"
                        fill="none"
                        stroke="var(--log-pill)"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                    />
                    <circle
                        cx="16.8"
                        cy="16.8"
                        fill="currentColor"
                        r="5.4"
                        stroke="var(--log-pill)"
                        strokeWidth="1.8"
                    />
                    <path
                        d="M16.8 14.1v2.7l1.8 1.1"
                        fill="none"
                        stroke="var(--log-pill)"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                    />
                </svg>
                <span>{copy.title}</span>
            </span>
            <span className="log-tab">
                <Glyph name="insights" />
                <span>{copy.insights}</span>
            </span>
            <span className="log-tab">
                <Glyph name="balances" />
                <span>{copy.balances}</span>
                <i className="log-badge">1</i>
            </span>
            <span className="log-tab">
                <Glyph name="settings" />
                <span>{copy.settings}</span>
            </span>
        </div>
    );
}

function Dial({ open }: { open: boolean }) {
    const copy = useIntlayer("film-log");
    const items = [
        { glyph: "importFile", label: copy.dialImport },
        { glyph: "scan", label: copy.dialScan },
        { glyph: "mic", label: copy.dialSpeak },
        { glyph: "transfer", label: copy.dialMove },
        { glyph: "receipt", label: copy.dialAdd },
    ] as const;
    return (
        <div className="log-dial" data-open={open || undefined}>
            {items.map(({ glyph, label }, index) => (
                <div className="log-dial-item" key={glyph} style={{ "--i": items.length - 1 - index }}>
                    <span className="log-dial-label">{label}</span>
                    <span
                        className="log-round log-dial-button"
                        data-target={glyph === "receipt" ? "dial-add" : undefined}
                    >
                        <Glyph name={glyph} size={22} />
                    </span>
                </div>
            ))}
        </div>
    );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

function Sheet({ amount, step }: Scene) {
    const copy = useIntlayer("film-log");
    const picked = step >= STEP.picked;
    const merchantActive = step === STEP.name;
    const chips = [
        { glyph: "sparkle", label: copy.chipIcon, on: picked, removable: true },
        { glyph: "tag", label: picked ? copy.chipTag : copy.chipTags, on: picked },
        { glyph: "split", label: copy.chipSplit },
        { glyph: "repeat", label: copy.chipRepeat },
        { glyph: "note", label: copy.chipNote },
        { glyph: "fee", label: copy.chipFee },
    ] as const;
    return (
        <div
            className="log-sheet"
            data-open={(step >= STEP.amount && step < STEP.logged) || undefined}
            data-wash={picked || undefined}
        >
            <div className="log-wash" />
            <div className="log-sheet-bar">
                <span className="log-round">
                    <Glyph name="close" size={20} />
                </span>
                <span className="log-sheet-title">{copy.sheetTitle}</span>
                <span className="log-round log-check" data-on={amount > 0 || undefined}>
                    <Glyph name="tick" size={20} stroke={2.2} />
                </span>
            </div>
            <p className="log-sentence">
                <span className="log-word">
                    {copy.spent}
                    <span className="log-kind">
                        <Glyph name="swap" size={11} stroke={2.2} />
                    </span>
                </span>{" "}
                <span className="log-word" data-active={step === STEP.amount || undefined}>
                    {formatMoney(amount)}
                </span>
                <span className="log-code">USD</span> <span className="log-link">{copy.at}</span>{" "}
                <span className="log-word" data-active={merchantActive || undefined} data-blank={!picked || undefined}>
                    <span className="log-arrive" key={picked ? "costco" : "blank"}>
                        {picked ? (
                            <>
                                <span className="log-inline">
                                    <Logo name="costco" size={19} />
                                </span>
                                Costco
                            </>
                        ) : (
                            copy.merchant
                        )}
                    </span>
                </span>{" "}
                <span className="log-link">{copy.for}</span>{" "}
                <span className="log-word" data-blank={!picked || undefined}>
                    <span className="log-arrive" key={picked ? "groceries" : "blank"}>
                        {picked ? (
                            <>
                                <span className="log-inline log-cart">
                                    <FilmIcon name="cart" size={20} />
                                </span>
                                {copy.groceries}
                            </>
                        ) : (
                            copy.category
                        )}
                    </span>
                </span>{" "}
                <span className="log-link">{copy.from}</span>{" "}
                <span className="log-word">
                    <span className="log-inline">
                        <Logo name="chase" size={19} />
                    </span>
                    Chase
                </span>{" "}
                <span className="log-word">{copy.todayWord}</span>
                <span className="log-link">.</span>
            </p>
            <Collapse open={picked}>
                <p className="log-tagged">{copy.tagged}</p>
            </Collapse>
            <div className="log-chips">
                {chips.map((chip) => (
                    <span className="log-chip" data-on={("on" in chip && chip.on) || undefined} key={chip.glyph}>
                        <Glyph name={chip.glyph} size={14} />
                        {chip.label}
                        {"removable" in chip && picked ? <Glyph name="close" size={12} stroke={2.2} /> : null}
                    </span>
                ))}
            </div>
            <div className="log-pane log-pad" data-on={step === STEP.amount || undefined}>
                <span className="log-currency log-currency-pick">
                    USD
                    <Glyph name="chevronDown" size={12} stroke={2.2} />
                </span>
                <div className="log-keys">
                    {KEYS.map((key) => (
                        <span
                            className="log-key"
                            data-target={key === "4" || key === "2" ? `key-${key}` : undefined}
                            key={key}
                        >
                            {key === "⌫" ? <Glyph name="backspace" size={22} stroke={1.6} /> : key}
                        </span>
                    ))}
                </div>
            </div>
            <div className="log-pane log-pick" data-on={step >= STEP.name || undefined}>
                <div className="log-pick-bar">
                    <span className="log-round log-back">
                        <Glyph name="back" size={20} />
                    </span>
                    <span className="log-sheet-title">{copy.name}</span>
                </div>
                <p className="log-field" data-filled={picked || undefined}>
                    {picked ? "Costco" : copy.namePlaceholder}
                </p>
                <p className="log-recent">{copy.recently}</p>
                <div className="log-merchants">
                    {["GitHub", "Nike", "Lyft", "Costco", "Figma", "Target"].map((name) => (
                        <span
                            className="log-merchant"
                            data-on={(name === "Costco" && picked) || undefined}
                            data-target={name === "Costco" ? "chip-costco" : undefined}
                            key={name}
                        >
                            {name}
                        </span>
                    ))}
                </div>
            </div>
            <span className="log-cta" data-target="cta">
                <span data-on={!picked || undefined}>{copy.next}</span>
                <span data-on={picked || undefined}>{copy.add}</span>
            </span>
        </div>
    );
}

function Screen(scene: Scene) {
    const dial = scene.step === STEP.dial;
    return (
        <div className="log-screen">
            <Body {...scene} />
            <div
                className="log-scrim"
                data-on={scene.step >= STEP.dial && scene.step < STEP.logged ? scene.step : undefined}
            />
            <div className="log-header">
                <span className="log-round">
                    <Glyph name="search" />
                </span>
                <span className="log-pill">
                    <Glyph name="calendar" />
                    <Glyph name="filter" />
                </span>
            </div>
            <TabBar />
            <Dial open={dial} />
            <span className="log-fab" data-open={dial || undefined} data-target="fab">
                <Glyph name="plus" size={28} stroke={2} />
            </span>
            <StatusBar />
            <Sheet {...scene} />
        </div>
    );
}

export function LogFilm() {
    return (
        <Stage<Scene>
            className="log-film"
            cursor={{ at: REST, style: "touch" }}
            height={874}
            initial={START}
            play="loop"
            poster={END}
            script={script}
            width={402}
        >
            {(scene) => (
                <div className="film-scene" data-out={scene.out || undefined}>
                    <Screen {...scene} />
                </div>
            )}
        </Stage>
    );
}
