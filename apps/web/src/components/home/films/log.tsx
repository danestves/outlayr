import TransactionHistorySolidIcon from "@hugeicons-pro/core-solid-rounded/TransactionHistoryIcon";
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowUpDownIcon from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import DivideSignCircleIcon from "@hugeicons/core-free-icons/DivideSignCircleIcon";
import Eraser01Icon from "@hugeicons/core-free-icons/Eraser01Icon";
import File02Icon from "@hugeicons/core-free-icons/File02Icon";
import FileImportIcon from "@hugeicons/core-free-icons/FileImportIcon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon";
import PercentCircleIcon from "@hugeicons/core-free-icons/PercentCircleIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import ReceiptDollarIcon from "@hugeicons/core-free-icons/ReceiptDollarIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import ScanIcon from "@hugeicons/core-free-icons/ScanIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Settings01Icon from "@hugeicons/core-free-icons/Settings01Icon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
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
    back: ArrowLeft01Icon,
    backspace: Eraser01Icon,
    balances: Clock01Icon,
    calendar: Calendar03Icon,
    chevronDown: ArrowDown01Icon,
    close: Cancel01Icon,
    fee: PercentCircleIcon,
    filter: FilterHorizontalIcon,
    importFile: FileImportIcon,
    insights: Analytics01Icon,
    mic: Mic01Icon,
    note: File02Icon,
    plus: PlusSignIcon,
    receipt: ReceiptDollarIcon,
    repeat: RepeatIcon,
    scan: ScanIcon,
    search: Search01Icon,
    settings: Settings01Icon,
    sparkle: SparklesIcon,
    split: DivideSignCircleIcon,
    swap: ArrowUpDownIcon,
    tag: Tag01Icon,
    tick: Tick02Icon,
    transfer: ArrowDataTransferHorizontalIcon,
} as const;

type GlyphName = keyof typeof GLYPHS;

function Glyph({ name, size = 22, stroke = 1.8 }: { name: GlyphName; size?: number; stroke?: number }) {
    return (
        <HugeiconsIcon
            aria-hidden
            icon={GLYPHS[name]}
            size={size}
            strokeWidth={stroke}
            style={{ display: "block", flexShrink: 0 }}
        />
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
                <HugeiconsIcon
                    aria-hidden
                    icon={TransactionHistorySolidIcon}
                    size={24}
                    style={{ display: "block", flexShrink: 0 }}
                />
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
