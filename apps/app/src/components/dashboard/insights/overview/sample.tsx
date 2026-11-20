import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import { SUGGESTED_CATEGORY_PRESETS } from "@outlayr/money/category-rules";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";

import { InsightsBar } from "../bar";
import { useInsightsFormat } from "../format";
import { Card, Change, FIGURE, Flat, GRID, KpiStrip, NOTE, Note, STATEMENT, Tray } from "../parts";
import type { PacePoint } from "./model";
import { PaceCard } from "./pace";

const DAYS = 31;
const OPENING = 1800;
const SPENT = 3210;
const BEFORE = 3420;
const INCOME = 4200;
const WOBBLE = 14;
const PRESET_COLORS = new Map(SUGGESTED_CATEGORY_PRESETS.expense.map((preset) => [preset.name, preset.color]));
const CATEGORIES = (
    [
        { delta: 0, id: "rent", preset: "Rent", spent: 1800 },
        { delta: -20, id: "groceries", preset: "Groceries", spent: 640 },
        { delta: -140, id: "shopping", preset: "Shopping", spent: 280 },
        { delta: -20, id: "dining", preset: "Dining Out", spent: 190 },
        { delta: -10, id: "transport", preset: "Transport", spent: 160 },
        { delta: -20, id: "subscriptions", preset: "Subscriptions", spent: 140 },
    ] as const
).map((category) => ({ ...category, color: PRESET_COLORS.get(category.preset) ?? NEUTRAL_COLOR }));

const climb = (index: number, end: number) => {
    const edge = index === 0 || index === DAYS - 1;
    return OPENING + (index / (DAYS - 1)) * (end - OPENING) + (edge ? 0 : (((index + 1) % 3) - 1) * WOBBLE);
};

function samplePoints(year: string): PacePoint[] {
    return Array.from({ length: DAYS }, (_, index) => ({
        day: `${year}-03-${String(index + 1).padStart(2, "0")}`,
        spent: climb(index, SPENT),
        usual: climb(index, BEFORE),
    }));
}

/** A made-up month, shown until the ledger has an entry of its own. */
export function SampleOverview() {
    const { ledger } = useDashboard();
    const { open } = useAccountFlows();
    const copy = useIntlayer("dashboard-insights-overview");
    const fmt = useInsightsFormat(ledger);
    const year = ledger.today.slice(0, 4);
    const march = fmt.longMonth(`${year}-03-15`);
    const february = fmt.longMonth(`${year}-02-15`);
    const versus = copy.kpi.versus({ period: february });
    const top = Math.max(...CATEGORIES.map((category) => category.spent));
    return (
        <>
            <InsightsBar>
                <Badge dot variant="warning">
                    {copy.sample.badge}
                </Badge>
                <span className={`${FIGURE} text-app-label ml-1 font-medium`}>{march}</span>
            </InsightsBar>
            <Tray className="mt-4 min-h-18 flex-row items-center gap-3 py-3 pr-4 pl-5">
                <div className="min-w-0 flex-1">
                    <h2 className={STATEMENT}>{copy.sample.title}</h2>
                    <p className={NOTE}>{copy.sample.line}</p>
                </div>
                <Button onClick={() => open({ kind: "entry" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {copy.sample.cta}
                </Button>
            </Tray>
            <div className="mt-4">
                <KpiStrip
                    figures={[
                        {
                            foot: (
                                <>
                                    <Change delta={(SPENT - BEFORE) / BEFORE} goodDirection="down" />
                                    <Note>{versus}</Note>
                                </>
                            ),
                            label: copy.kpi.spent,
                            value: fmt.amount(SPENT),
                        },
                        {
                            foot: (
                                <>
                                    <Change delta={0} />
                                    <Note>{versus}</Note>
                                </>
                            ),
                            label: copy.kpi.income,
                            value: fmt.amount(INCOME),
                        },
                        {
                            foot: (
                                <>
                                    <Flat>{`${Math.round(((INCOME - SPENT) / INCOME) * 100)}%`}</Flat>
                                    <Note>{copy.kpi.ofIncome}</Note>
                                </>
                            ),
                            label: copy.kpi.kept,
                            value: fmt.amount(INCOME - SPENT),
                        },
                        {
                            foot: <Note>{copy.kpi.days({ count: String(DAYS) })}</Note>,
                            label: copy.kpi.byDay,
                            value: fmt.amount(SPENT / DAYS),
                        },
                    ]}
                />
            </div>
            <div className={`${GRID} mt-4 flex-1`}>
                <PaceCard
                    aspectRatio={704 / 536}
                    className="lg:col-span-2"
                    headline={copy.sample.less({ amount: fmt.whole(BEFORE - SPENT), period: february })}
                    label={copy.pace.chart.value}
                    line={copy.sample.gaveBack({ amount: fmt.whole(140), category: copy.sample.categories.shopping })}
                    names={{ spent: march, usual: february }}
                    points={samplePoints(year)}
                    usualShown
                />
                <Card
                    action={<span className={NOTE}>{versus}</span>}
                    panelClassName="divide-y-0"
                    title={copy.where.title}
                >
                    {CATEGORIES.map((category) => (
                        <div className="border-border border-t px-5 py-1.75 first:border-t-0" key={category.id}>
                            <div className="text-app-label flex items-center font-medium">
                                <span
                                    aria-hidden
                                    className="mr-2.25 size-2 rounded-xs"
                                    style={{ background: category.color }}
                                />
                                {copy.sample.categories[category.id]}
                                <span className={`${FIGURE} ml-auto font-normal`}>{fmt.whole(category.spent)}</span>
                                <span
                                    className={`${FIGURE} text-app-caption ml-2.5 w-12 text-right font-normal ${category.delta === 0 ? "text-muted-foreground" : "text-app-income"}`}
                                >
                                    {category.delta === 0 ? "0" : fmt.signedWhole(category.delta)}
                                </span>
                            </div>
                            <span
                                aria-hidden
                                className="mt-1.75 block h-1.5 overflow-hidden rounded-full"
                                style={{ background: `color-mix(in oklab, ${category.color} 18%, transparent)` }}
                            >
                                <span
                                    className="block h-full rounded-full"
                                    style={{ background: category.color, width: `${(category.spent / top) * 100}%` }}
                                />
                            </span>
                        </div>
                    ))}
                </Card>
            </div>
        </>
    );
}
