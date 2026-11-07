import { useIntlayer } from "react-intlayer";

import type { Act } from "@/stageshow/act";
import { Stage } from "@/stageshow/stage";

import { CategoryTile, formatMoney, loopBack, Micro, Money, Ruled } from "./parts";
import type { Category } from "./parts";
import { FILM_COMPACT_BELOW, FILM_SIZES } from "./sizes";

import "./month.css";

interface Scene {
    out: boolean;
    step: number;
}

const START: Scene = { out: false, step: 0 };
const END: Scene = { out: false, step: 5 };

const SPENT = 597.95;
const BARS = [0.35, 0.09, 0.58, 0.3, 0.95, 0.42, 0];
const AVERAGE = 0.4;
const MOVERS: readonly { amount: number; category: Category; change?: string }[] = [
    { amount: -1850, category: "rent", change: "−100%" },
    { amount: 122.46, category: "groceries", change: "+95%" },
    { amount: 112.34, category: "utilities" },
];

const script = async (act: Act<Scene>) => {
    await act.wait(300);
    act.put({ step: 1 });
    await act.wait(700);
    act.put({ step: 2 });
    await act.wait(500);
    act.put({ step: 3 });
    await act.wait(1100);
    act.put({ step: 4 });
    await act.wait(700);
    act.put({ step: 5 });
    await loopBack(act, { out: true }, START);
};

export function MonthFilm() {
    const copy = useIntlayer("film-month");
    const days = copy.days.value.split(" ");
    return (
        <Stage<Scene>
            compact={{ below: FILM_COMPACT_BELOW, ...FILM_SIZES.month.compact }}
            height={FILM_SIZES.month.wide.height}
            initial={START}
            play="loop"
            poster={END}
            script={script}
            width={FILM_SIZES.month.wide.width}
        >
            {({ out, step }, _rect, layout) => {
                const compact = layout === "compact";
                const movers = compact ? MOVERS.slice(0, 2) : MOVERS;
                return (
                    <div className="film-scene" data-out={out || undefined}>
                        <div className="month-panel film-panel" data-layout={layout}>
                            <div className="month-head">
                                <Micro>{copy.range}</Micro>
                                <span className="month-chip" data-in={step >= 4 || undefined}>
                                    −74%
                                </span>
                            </div>
                            <div className="film-rise" data-in={step >= 1 || undefined}>
                                <Money sign="−" size={compact ? 52 : 76} value={step >= 1 ? SPENT : 0} />
                            </div>
                            <p className="month-verdict film-rise" data-in={step >= 2 || undefined}>
                                {copy.verdict}
                            </p>
                            {compact ? null : (
                                <div
                                    className="month-totals film-rise"
                                    data-in={step >= 2 || undefined}
                                    style={{ "--i": 1 }}
                                >
                                    <div>
                                        <Micro>{copy.income}</Micro>
                                        <b className="month-income">{formatMoney(1450, { plus: true })}</b>
                                    </div>
                                    <div>
                                        <Micro>{copy.net}</Micro>
                                        <b>{formatMoney(852.05, { plus: true })}</b>
                                    </div>
                                </div>
                            )}
                            <div className="month-bars" data-in={step >= 3 || undefined}>
                                {BARS.map((bar, index) => (
                                    <div className="month-day" key={`${days[index]}-${bar}`} style={{ "--i": index }}>
                                        <span className="month-track">
                                            <span className="month-fill" style={{ "--h": bar }} />
                                        </span>
                                        <span className="month-letter">{days[index]}</span>
                                    </div>
                                ))}
                                <span
                                    className="month-average"
                                    data-in={step >= 4 || undefined}
                                    style={{ "--h": AVERAGE }}
                                >
                                    <span>$85</span>
                                </span>
                            </div>
                            <Ruled left={copy.movers} right={copy.versus} />
                            {movers.map((mover, index) => (
                                <div
                                    className="month-mover film-rise"
                                    data-in={step >= 5 || undefined}
                                    key={mover.category}
                                    style={{ "--i": index }}
                                >
                                    <CategoryTile category={mover.category} size={compact ? 28 : 30} />
                                    <span className="month-name">{copy[mover.category]}</span>
                                    <span className={mover.amount < 0 ? "month-income" : "month-spend"}>
                                        {formatMoney(mover.amount, { plus: true })}
                                    </span>
                                    <span className="month-change">{mover.change ?? copy.fresh}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }}
        </Stage>
    );
}
