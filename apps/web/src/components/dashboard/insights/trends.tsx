import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { titled } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";

import { KEPT_COLOR } from "./flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";
import { Aside, Nothing, PhoneCard } from "./phone/card";
import { AXIS, AXIS_NOW, Curves, Plot, Stroke } from "./phone/plot";
import { axisFromZero, bumpArea, bumpLine, floatingAxis, labelled, mirrorAxis, waterfall } from "./phone/scale";

const INCOME = "var(--color-app-income)";
const SPEND = "var(--color-app-spend)";
const NOW = "color-mix(in oklab, var(--color-foreground) 85%, transparent)";
const NOW_BAR = "color-mix(in oklab, var(--color-foreground) 92%, transparent)";
const AVERAGE =
    "repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-foreground) 70%, transparent) 0 4px, transparent 4px 7px)";
const GUTTER = 58;
const WORTH_GUTTER = 64;
const BARS_HEIGHT = 156;
const BAR_ROWS = 3;
const MIRROR_HEIGHT = 176;
const MIRROR_ROWS = 2;
const WORTH_HEIGHT = 168;
const WORTH_ROWS = 4;
const MIN_BAR = 2;

const keptPercent = (income: number, spent: number) =>
    income > 0 ? Math.round(((income - spent) / income) * 100) : null;

const percent = (share: number) => `${share * 100}%`;

function Chart({ children, className, label }: { children: ReactNode; className: string; label: string }) {
    return (
        <div
            aria-label={label}
            className={`relative ${className}`}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
            role="img"
        >
            {children}
        </div>
    );
}

/** The plot less the room its last point's dot needs at the right. */
function Points({ children }: { children: ReactNode }) {
    return <div className="absolute inset-y-0 right-2 left-0">{children}</div>;
}

export function ChangesCard({ model }: { model: InsightsModel }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const { locale } = useLocale();
    const fmt = useInsightsFormat(ledger);
    const period = titled(fmt.periodName(filters.period), locale);
    const title = copy.changes.title({ period });
    const { changes } = model;
    if (changes === null) {
        return (
            <PhoneCard title={title}>
                <Nothing>{copy.changes.empty}</Nothing>
            </PhoneCard>
        );
    }
    const steps = waterfall(
        changes.usual,
        [
            ...changes.moves.map((move) => ({ delta: move.delta, id: move.categoryId })),
            ...(changes.other === 0 ? [] : [{ delta: changes.other, id: "other" }]),
        ],
        changes.now
    );
    const named = new Map([
        ["now", period],
        ["other", copy.changes.other.value],
        ["usual", copy.changes.usual.value],
    ]);
    const colorOf = (step: (typeof steps)[number]) => {
        if (step.kind === "move") {
            return step.amount > 0 ? SPEND : INCOME;
        }
        return step.id === "usual" ? KEPT_COLOR : NOW;
    };
    return (
        <PhoneCard aside={<Aside value={fmt.whole(changes.usual)} />} title={title}>
            <ol className="flex flex-col gap-[13px] pt-5 pr-[15px] pb-[23px]">
                {steps.map((step) => (
                    <li className="relative flex h-5 items-center text-[13.5px]" key={step.id}>
                        <span className="w-24 shrink-0 truncate text-right">
                            {step.kind === "move"
                                ? (ledger.categories.get(step.id)?.name ?? named.get("other"))
                                : named.get(step.id)}
                        </span>
                        <span aria-hidden className="absolute inset-y-0 right-1 left-[107px]">
                            <span
                                className="absolute inset-y-0 rounded"
                                style={{
                                    background: colorOf(step),
                                    left: percent(step.left),
                                    minWidth: MIN_BAR,
                                    width: percent(step.width),
                                }}
                            />
                        </span>
                        <span className={`${AXIS} relative ml-auto`}>
                            {step.kind === "move" ? fmt.signedWhole(step.amount) : fmt.whole(step.amount)}
                        </span>
                    </li>
                ))}
            </ol>
        </PhoneCard>
    );
}

export function MonthsCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const { months } = model;
    const before = months.slice(0, -1);
    const average = before.length === 0 ? 0 : before.reduce((sum, month) => sum + month.spent, 0) / before.length;
    const highest = Math.max(average, ...months.map((month) => month.spent));
    if (highest === 0) {
        return (
            <PhoneCard title={copy.months.title}>
                <Nothing>{copy.empty.spending}</Nothing>
            </PhoneCard>
        );
    }
    const axis = axisFromZero(highest, BAR_ROWS);
    const last = months.length - 1;
    return (
        <PhoneCard
            aside={average > 0 ? <Aside label={copy.months.averageLabel.value} value={fmt.whole(average)} /> : null}
            title={copy.months.title}
        >
            <Chart className="h-[221px]" label={copy.months.title.value}>
                <Plot
                    gutter={GUTTER}
                    height={BARS_HEIGHT}
                    lines={axis.ticks.map((tick, index) => ({
                        at: (index * BARS_HEIGHT) / BAR_ROWS,
                        label: fmt.compact(tick),
                    }))}
                >
                    <div className="absolute inset-0 flex">
                        {months.map((month, index) => (
                            <div className="relative flex min-w-0 flex-1 items-end justify-center" key={month.key}>
                                <span
                                    className="w-[55.56%] max-w-10 rounded-[3px]"
                                    style={{
                                        background: index === last ? NOW_BAR : KEPT_COLOR,
                                        height: percent(month.spent / axis.top),
                                    }}
                                />
                                <span
                                    className={`${AXIS} absolute top-full mt-[5px] ${index === last ? AXIS_NOW : ""}`}
                                >
                                    {fmt.month(month.key)}
                                </span>
                            </div>
                        ))}
                    </div>
                    {average > 0 ? (
                        <span
                            className="absolute right-0.5 left-0 h-px"
                            style={{ background: AVERAGE, top: Math.floor(BARS_HEIGHT * (1 - average / axis.top)) }}
                        />
                    ) : null}
                </Plot>
            </Chart>
        </PhoneCard>
    );
}

export function IncomeSpendingCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const { months } = model;
    const kept = keptPercent(model.flow.income, model.flow.spent);
    const empty = months.every((month) => month.income === 0 && month.spent === 0);
    const single = months.length < 2;
    if (empty || single) {
        return (
            <PhoneCard title={copy.trend.title}>
                <Nothing>{single ? copy.trend.single : copy.empty.cashFlow}</Nothing>
            </PhoneCard>
        );
    }
    const axis = mirrorAxis(
        Math.max(...months.map((month) => month.income)),
        Math.max(...months.map((month) => month.spent)),
        MIRROR_ROWS
    );
    const last = months.length - 1;
    const zero = axis.zero * MIRROR_HEIGHT;
    const across = (index: number) => (index / last) * 100;
    const income = months.map((month, index) => ({
        x: across(index),
        y: zero - (month.income / axis.whole) * MIRROR_HEIGHT,
    }));
    const spent = months.map((month, index) => ({
        x: across(index),
        y: zero + (month.spent / axis.whole) * MIRROR_HEIGHT,
    }));
    const ends = [
        { color: INCOME, y: income.at(-1)?.y ?? zero },
        { color: SPEND, y: spent.at(-1)?.y ?? zero },
    ];
    return (
        <PhoneCard
            aside={kept === null ? null : <Aside label={copy.measures.kept.value} value={`${kept}%`} />}
            title={copy.trend.title}
        >
            <Chart className="h-[250px]" label={copy.trend.title.value}>
                <Plot
                    gutter={GUTTER}
                    height={MIRROR_HEIGHT}
                    lines={axis.lines.map((line) => ({
                        at: line.at * MIRROR_HEIGHT,
                        label: fmt.compact(line.value),
                        zero: line.at === axis.zero,
                    }))}
                >
                    <Points>
                        <Curves height={MIRROR_HEIGHT}>
                            <path d={bumpArea(income, zero)} fill={INCOME} fillOpacity={0.22} />
                            <path d={bumpArea(spent, zero)} fill={SPEND} fillOpacity={0.24} />
                            <Stroke color={INCOME} d={bumpLine(income)} />
                            <Stroke color={SPEND} d={bumpLine(spent)} />
                        </Curves>
                        <span className="bg-muted-foreground absolute inset-y-0 right-0 w-px" />
                        {ends.map((end) => (
                            <span
                                className="border-card absolute right-0 size-[8.5px] translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px]"
                                key={end.color}
                                style={{ background: end.color, top: end.y }}
                            />
                        ))}
                        {months.map((month, index) => (
                            <span
                                className={`${AXIS} absolute top-full mt-0.5 -translate-x-1/2 text-center leading-4 ${index === last ? AXIS_NOW : ""}`}
                                key={month.key}
                                style={{ left: `${across(index)}%` }}
                            >
                                <span className="block">{fmt.month(month.key)}</span>
                                <span className="block">
                                    {month.income > 0 ? `${keptPercent(month.income, month.spent)}%` : " "}
                                </span>
                            </span>
                        ))}
                    </Points>
                </Plot>
            </Chart>
        </PhoneCard>
    );
}

export function NetWorthCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const values = model.netWorth.map((month) => Number(month.netWorth));
    const worth = values.at(-1) ?? 0;
    if (values.length < 2) {
        return (
            <PhoneCard aside={<Aside value={fmt.whole(worth)} />} title={copy.netWorth.title}>
                <Nothing>{copy.trend.single}</Nothing>
            </PhoneCard>
        );
    }
    const axis = floatingAxis(values, WORTH_ROWS);
    const last = values.length - 1;
    const across = (index: number) => (index / last) * 100;
    const points = values.map((value, index) => ({
        x: across(index),
        y: (WORTH_HEIGHT * (axis.top - value)) / (axis.top - axis.floor),
    }));
    const shown = labelled(values.length);
    return (
        <PhoneCard aside={<Aside value={fmt.whole(worth)} />} title={copy.netWorth.title}>
            <Chart className="h-[230px]" label={copy.netWorth.title.value}>
                <Plot
                    gutter={WORTH_GUTTER}
                    height={WORTH_HEIGHT}
                    lines={axis.ticks.map((tick, index) => ({
                        at: (index * WORTH_HEIGHT) / WORTH_ROWS,
                        label: fmt.compact(tick),
                    }))}
                >
                    <Points>
                        <Curves height={WORTH_HEIGHT}>
                            <path
                                d={bumpArea(points, WORTH_HEIGHT)}
                                fill="var(--color-foreground)"
                                fillOpacity={0.12}
                            />
                            <Stroke color="var(--color-foreground)" d={bumpLine(points)} />
                        </Curves>
                        <span
                            className="bg-foreground absolute right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{ top: points.at(-1)?.y }}
                        />
                        {model.netWorth.map((month, index) =>
                            shown(index) ? (
                                <span
                                    className={`${AXIS} absolute top-full mt-1 -translate-x-1/2`}
                                    key={String(month.key)}
                                    style={{ left: `${across(index)}%` }}
                                >
                                    {fmt.month(String(month.key))}
                                </span>
                            ) : null
                        )}
                    </Points>
                </Plot>
            </Chart>
        </PhoneCard>
    );
}
