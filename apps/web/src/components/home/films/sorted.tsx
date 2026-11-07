import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { Act } from "@/stageshow/act";
import { Count } from "@/stageshow/motion/Count";
import { Stage } from "@/stageshow/stage";

import { CategoryTile, FilmIcon, formatMoney, Logo, loopBack, Micro, Money, Ruled } from "./parts";
import type { LogoName } from "./parts";
import { FILM_COMPACT_BELOW, FILM_SIZES } from "./sizes";

import "./sorted.css";

interface Scene {
    out: boolean;
    step: number;
}

const START: Scene = { out: false, step: 0 };
const END: Scene = { out: false, step: 8 };

const CHASE = { after: 12_480.32, before: 12_522.32 };
const LEFT = { after: 1018.59, before: 1060.59 };
const GROCERIES = { after: 250.89, before: 208.89, limit: 300 };
const SPENT = { after: 2881, before: 2839 };

const STEP_BEFORE = "M0 10V76H13V80H27V84H40V86H53V90H67V93H80V97H93V99H107V104H120V107H133V110H147";
const AREA = "M0 10V76H13V80H27V84H40V86H53V90H67V93H80V97H93V99H107V104H120V107H133V110H147V113H160V150H0Z";

const script = async (act: Act<Scene>) => {
    await act.wait(400);
    act.put({ step: 1 });
    await act.wait(1300);
    act.put({ step: 2 });
    await act.wait(850);
    act.put({ step: 3 });
    await act.wait(1700);
    act.put({ step: 4 });
    await act.wait(900);
    act.put({ step: 5 });
    await act.wait(2300);
    act.put({ step: 6 });
    await act.wait(800);
    act.put({ step: 7 });
    await act.wait(1900);
    act.put({ step: 8 });
    await loopBack(act, { out: true }, START);
};

interface Account {
    amount: string;
    currency: string;
    logo: LogoName;
    name: string;
}

interface Upcoming {
    amount: string;
    date: string;
    logo: LogoName;
    name: string;
}

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

function Flip({ from, on, to }: { from: ReactNode; on: boolean; to: ReactNode }) {
    return (
        <span className="sorted-flip" data-on={on || undefined}>
            <span>{from}</span>
            <span>{to}</span>
        </span>
    );
}

function Row({
    children,
    done,
    hit,
    logo,
    name,
    sub,
    trailing,
}: {
    children: ReactNode;
    done?: boolean;
    hit: boolean;
    logo: LogoName;
    name: string;
    sub: ReactNode;
    trailing?: ReactNode;
}) {
    return (
        <div className="sorted-row" data-done={done || undefined} data-hit={hit || undefined}>
            <Logo name={logo} size={38} />
            <span className="sorted-who">
                <span className="sorted-name">{name}</span>
                <span className="sorted-sub">{sub}</span>
            </span>
            {trailing}
            <span className="sorted-amount">{children}</span>
        </div>
    );
}

function Chip({ at, step, to }: { at: number; step: number; to: "budget" | "chase" | "upcoming" }) {
    let state: "done" | "fly" | undefined;
    if (step === at) {
        state = "fly";
    } else if (step > at) {
        state = "done";
    }
    return (
        <span className="sorted-chip" data-state={state} data-to={to}>
            <span>−$42.00</span>
        </span>
    );
}

function AccountsPanel({ compact, step }: { compact: boolean; step: number }) {
    const copy = useIntlayer("film-sorted");
    const accounts: readonly Account[] = [
        { amount: "$9,450.00", currency: "USD", logo: "ally", name: "Ally Savings" },
        { amount: "$3,412.40", currency: "USD", logo: "zinli", name: "Zinli" },
        { amount: "Bs.486,000.00", currency: "VES", logo: "banesco", name: "Banesco" },
        { amount: "$612.80", currency: "USD", logo: "paypal", name: "PayPal" },
        { amount: "−$842.15", currency: "USD", logo: "applecard", name: "Apple Card" },
        { amount: "−$1,240.55", currency: "USD", logo: "amex", name: "Amex Gold" },
        { amount: "$220.00", currency: "USD", logo: "cash", name: copy.cash.value },
    ];
    return (
        <section className="sorted-accounts sorted-panel film-panel">
            <Micro>{copy.accounts}</Micro>
            <div className="sorted-group">
                <Row
                    hit={step === 3}
                    logo="chase"
                    name="Chase"
                    sub={<Flip from="USD" on={step >= 3} to={`Costco ${formatMoney(-42)}`} />}
                >
                    <Count duration={900} format={formatMoney} value={step >= 3 ? CHASE.after : CHASE.before} />
                </Row>
                {(compact ? accounts.slice(0, 1) : accounts).map((account) => (
                    <Row hit={false} key={account.name} logo={account.logo} name={account.name} sub={account.currency}>
                        {account.amount}
                    </Row>
                ))}
            </div>
        </section>
    );
}

const stretch = (node: SVGSVGElement | null) => node?.setAttribute("preserveAspectRatio", "none");

function Chart({ landed }: { landed: boolean }) {
    return (
        <div className="sorted-chart" data-in={landed || undefined}>
            <svg aria-hidden className="sorted-plot" ref={stretch} viewBox="0 0 400 166">
                <path className="sorted-area" d={AREA} />
                <line className="sorted-ideal" x1="0" x2="400" y1="10" y2="150" />
                <line className="sorted-base" x1="0" x2="400" y1="150" y2="150" />
                <line className="sorted-today" x1="160" x2="160" y1="0" y2="166" />
                <path className="sorted-step" d={STEP_BEFORE} />
                <path className="sorted-step sorted-step-new" d="M147 110V113H160" />
            </svg>
            <svg aria-hidden className="sorted-plot sorted-forecast" ref={stretch} viewBox="0 0 400 166">
                <line x1="160" x2="400" y1="113" y2="161.5" />
            </svg>
            <span className="sorted-dot" />
        </div>
    );
}

function BudgetPanel({ compact, step }: { compact: boolean; step: number }) {
    const copy = useIntlayer("film-sorted");
    const landed = step >= 5;
    return (
        <section className="sorted-budget sorted-panel film-panel">
            <div className="sorted-head">
                <Micro>{copy.scope}</Micro>
                <Micro>{copy.daysLeft}</Micro>
            </div>
            <div className="sorted-left">
                <Money size={compact ? 44 : 58} value={landed ? LEFT.after : LEFT.before} />
            </div>
            <p className="sorted-caption">
                {copy.left}
                <span className="sorted-tag" data-in={landed || undefined}>
                    {formatMoney(-42)}
                </span>
            </p>
            <Chart landed={landed} />
            {compact ? null : (
                <div className="sorted-stats">
                    <div>
                        <Micro>{copy.limit}</Micro>
                        <b>$3,900</b>
                    </div>
                    <div>
                        <Micro>{copy.spent}</Micro>
                        <b>
                            <Count duration={900} format={money} value={landed ? SPENT.after : SPENT.before} />
                        </b>
                    </div>
                    <div>
                        <Micro>{copy.aDay}</Micro>
                        <b>$57</b>
                    </div>
                </div>
            )}
            <div className="sorted-grocery" data-hit={step === 5 || undefined}>
                <CategoryTile category="groceries" size={compact ? 30 : 34} />
                <div className="sorted-bar-box">
                    <div className="sorted-bar-text">
                        <span className="sorted-name">{copy.groceries}</span>
                        <span className="sorted-of">
                            <Count
                                className="sorted-of-now"
                                duration={900}
                                format={formatMoney}
                                value={landed ? GROCERIES.after : GROCERIES.before}
                            />{" "}
                            {copy.of} {money(GROCERIES.limit)}
                        </span>
                    </div>
                    <span className="sorted-track">
                        <span
                            className="sorted-fill"
                            style={{ "--to": (landed ? GROCERIES.after : GROCERIES.before) / GROCERIES.limit }}
                        />
                    </span>
                </div>
            </div>
        </section>
    );
}

function UpcomingPanel({ compact, step }: { compact: boolean; step: number }) {
    const copy = useIntlayer("film-sorted");
    const items: readonly Upcoming[] = [
        { amount: "−$85.00", date: `5 ${copy.oct.value}`, logo: "verizon", name: "Verizon" },
        { amount: "−$11.99", date: `3 ${copy.oct.value}`, logo: "spotify", name: "Spotify" },
        { amount: "−$1,850.00", date: `1 ${copy.oct.value}`, logo: "rent", name: copy.rent.value },
        { amount: "−$22.99", date: `1 ${copy.oct.value}`, logo: "netflix", name: "Netflix" },
    ];
    const logged = step >= 7;
    return (
        <section className="sorted-upcoming sorted-panel film-panel">
            <Ruled left={copy.upcoming} right="−$2,163.96" />
            <div className="sorted-list">
                {(compact ? items.slice(1) : items).map((item) => {
                    const spotify = item.logo === "spotify";
                    return (
                        <Row
                            done={spotify && logged}
                            hit={spotify && step === 7}
                            key={item.name}
                            logo={item.logo}
                            name={item.name}
                            sub={spotify ? <Flip from={item.date} on={logged} to={copy.logged} /> : item.date}
                            trailing={
                                spotify ? (
                                    <span className="sorted-check" data-in={logged || undefined}>
                                        <FilmIcon name="check" size={13} stroke={2.6} />
                                    </span>
                                ) : null
                            }
                        >
                            {item.amount}
                        </Row>
                    );
                })}
            </div>
        </section>
    );
}

function EntryCard({ compact, step }: { compact: boolean; step: number }) {
    const copy = useIntlayer("film-sorted");
    return (
        <div className="sorted-entry" data-in={step >= 1 || undefined}>
            <Logo name="costco" size={compact ? 34 : 40} />
            <span className="sorted-who">
                <span className="sorted-name">Costco</span>
                <span className="sorted-sub">{`${copy.groceries.value} · Chase`}</span>
            </span>
            <span className="sorted-amount">{formatMoney(-42)}</span>
        </div>
    );
}

export function SortedFilm() {
    return (
        <Stage<Scene>
            compact={{ below: FILM_COMPACT_BELOW, ...FILM_SIZES.sorted.compact }}
            height={FILM_SIZES.sorted.wide.height}
            initial={START}
            play="loop"
            poster={END}
            script={script}
            width={FILM_SIZES.sorted.wide.width}
        >
            {({ out, step }, _rect, layout) => {
                const compact = layout === "compact";
                return (
                    <div className="film-scene" data-out={out || undefined}>
                        <div className="sorted" data-layout={layout}>
                            <AccountsPanel compact={compact} step={step} />
                            <BudgetPanel compact={compact} step={step} />
                            <UpcomingPanel compact={compact} step={step} />
                            <EntryCard compact={compact} step={step} />
                            <Chip at={2} step={step} to="chase" />
                            <Chip at={4} step={step} to="budget" />
                            <Chip at={6} step={step} to="upcoming" />
                        </div>
                    </div>
                );
            }}
        </Stage>
    );
}
