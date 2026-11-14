import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useIntlayer, useLocale } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { usePlan } from "@/components/dashboard/settings/plan";
import { cn } from "@/lib/utils";

import type { useInsightsFormat } from "../format";
import { Card } from "../parts";
import type { Kept, YearCategory, YearChange, YearMonth } from "./model";

const PERCENT = 100;
const LINE = "border-border flex h-11 items-center gap-2 border-t px-5 text-[13px] font-medium first:border-t-0";
const GOOD = "text-app-income";
const POOR = "text-(--color-app-spend)";
const WHERE_ROWS = 6;

type Fmt = ReturnType<typeof useInsightsFormat>;

const percent = (value: number) => `${Math.round(value * PERCENT)}%`;

interface WhereProps {
    categories: readonly YearCategory[];
    /** The calendar year the rows belong to; a rolling window has none, so its rows do not link. */
    choice: string | null;
    fmt: Fmt;
    label: string;
}

export function WhereItWent({ categories, choice, fmt, label }: WhereProps) {
    const copy = useIntlayer("dashboard-insights-year");
    const categoryName = useCategoryName();
    const top = categories[0]?.share ?? 0;
    return (
        <Card
            action={<span className="dash-figure text-muted-foreground text-[13px] font-normal">{label}</span>}
            panelClassName="p-0"
            title={copy.card.where}
        >
            {categories.slice(0, WHERE_ROWS).map((category) => {
                const body = (
                    <>
                        <span className="flex items-center text-[13px] font-medium">
                            <span
                                aria-hidden
                                className="mr-[9px] size-2 shrink-0 rounded-[2px]"
                                style={{ background: category.color }}
                            />
                            <span className="min-w-0 truncate">
                                {categoryName({ id: category.id, name: category.label })}
                            </span>
                            <span className="dash-figure ml-auto font-normal">{fmt.whole(category.value)}</span>
                            <span className="dash-figure text-muted-foreground ml-2.5 w-[30px] text-right text-xs font-normal">
                                {percent(category.share)}
                            </span>
                        </span>
                        <span
                            aria-hidden
                            className="mt-[7px] block h-1.5 overflow-hidden rounded-full"
                            style={{ background: `color-mix(in oklab, ${category.color} 18%, transparent)` }}
                        >
                            <span
                                className="block h-full rounded-full"
                                style={{
                                    background: category.color,
                                    width: `${top > 0 ? (category.share / top) * PERCENT : 0}%`,
                                }}
                            />
                        </span>
                    </>
                );
                const row = "border-border flex h-[57px] flex-col justify-center border-t px-5 first:border-t-0";
                return choice === null ? (
                    <div className={row} key={category.id}>
                        {body}
                    </div>
                ) : (
                    <Link
                        className={cn(
                            row,
                            "hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] transition-colors duration-150 outline-none"
                        )}
                        key={category.id}
                        search={(prev) => ({ accounts: prev.accounts, category: category.id, period: choice })}
                        to="/insights/cash-flow"
                    >
                        {body}
                    </Link>
                );
            })}
        </Card>
    );
}

interface KeptProps {
    choiceLabel: string | null;
    fmt: Fmt;
    here: Kept | null;
    /** A year of Pro in the ledger currency, with how many of them the kept money pays for. */
    pro: { cost: number; times: number } | null;
    recent: Kept | null;
}

function Bar({
    color,
    label,
    muted,
    value,
    width,
}: {
    color: string;
    label: string;
    muted?: boolean;
    value: string;
    width: number;
}) {
    return (
        <>
            <div className="text-muted-foreground flex justify-between text-[13px] leading-5">
                <span>{label}</span>
                <span className="dash-figure">{value}</span>
            </div>
            <div className="bg-muted mt-1.5 mb-3 flex h-2 overflow-hidden rounded-full" aria-hidden>
                <span
                    className={cn("block h-full rounded-full", muted && "opacity-45")}
                    style={{ background: color, width: `${Math.min(Math.max(width, 0), 1) * PERCENT}%` }}
                />
            </div>
        </>
    );
}

function KeptBars({ choiceLabel, fmt, here, pro, recent }: KeptProps & { here: Kept }) {
    const copy = useIntlayer("dashboard-insights-year");
    const green = "var(--color-app-income)";
    const widest = Math.max(here.kept, recent?.kept ?? 0);
    if (choiceLabel === null) {
        return (
            <>
                <Bar
                    color={green}
                    label={copy.card.kept.value}
                    value={fmt.whole(here.kept)}
                    width={pro ? 1 : here.kept / Math.max(here.budgeted, 1)}
                />
                {pro ? (
                    <Bar
                        color="var(--color-app-tint)"
                        label={copy.card.pro.value}
                        value={fmt.amount(pro.cost)}
                        width={pro.cost / here.kept}
                    />
                ) : (
                    <Bar
                        color="var(--color-app-strong)"
                        label={copy.budgeted.value}
                        value={fmt.whole(here.budgeted)}
                        width={1}
                    />
                )}
            </>
        );
    }
    return (
        <>
            <Bar
                color={green}
                label={choiceLabel}
                value={fmt.whole(here.kept)}
                width={widest > 0 ? here.kept / widest : 0}
            />
            {recent === null ? null : (
                <Bar
                    color={green}
                    label={copy.seg.recent.value}
                    muted
                    value={fmt.whole(recent.kept)}
                    width={widest > 0 ? recent.kept / widest : 0}
                />
            )}
        </>
    );
}

/** The renewal line, only once the plan query has answered; lifetime and no plan have nothing to renew. */
function PlanFooter() {
    const copy = useIntlayer("dashboard-insights-year");
    const plan = useIntlayer("plan");
    const { locale } = useLocale();
    const { data } = usePlan();
    if (!data || data.expiresAtMs === null) {
        return null;
    }
    const date = new Date(data.expiresAtMs).toLocaleDateString(locale, { day: "numeric", month: "short" });
    const price = data.price
        ? new Intl.NumberFormat(locale, { currency: data.price.currency, style: "currency" }).format(data.price.amount)
        : null;
    const line = (() => {
        if (data.state === "trial") {
            return plan.trialFooter.value;
        }
        if (data.state === "ends") {
            return copy.card.proEnds({ date }).value;
        }
        return data.state === "renews" && price ? plan.renewsFooter({ date, price }).value : null;
    })();
    if (line === null) {
        return null;
    }
    return (
        <div className="mt-auto flex items-center gap-2 px-4 pt-3 pb-3.5">
            <span className="text-muted-foreground text-[13px] leading-[17px]">{line}</span>
            <Button
                className="ml-auto h-[30px] px-2.5"
                render={<Link to="/settings/plan" />}
                size="sm"
                variant="outline"
            >
                {copy.card.manage}
            </Button>
        </div>
    );
}

export function KeptCard({ choiceLabel, fmt, here, pro, recent }: KeptProps) {
    const copy = useIntlayer("dashboard-insights-year");
    return (
        <Card panelClassName="p-0" title={copy.card.kept}>
            <div className="dash-figure flex items-baseline gap-2 px-5 pb-3.5 text-[28px] leading-[34px] font-semibold tracking-[-0.04em]">
                {here === null ? (
                    <span className="text-muted-foreground text-base">{copy.noBudgets}</span>
                ) : (
                    fmt.whole(here.kept)
                )}
                {pro && choiceLabel === null ? (
                    <span className="bg-app-income/15 text-app-income rounded-full px-2 py-0.5 text-xs leading-4 font-medium tracking-[-0.02em]">
                        {`${pro.times}x`}
                    </span>
                ) : null}
            </div>
            {here === null ? null : (
                <div className="px-4 pt-4">
                    <KeptBars
                        choiceLabel={choiceLabel}
                        fmt={fmt}
                        here={here}
                        pro={choiceLabel === null ? pro : null}
                        recent={recent}
                    />
                </div>
            )}
            {choiceLabel === null ? <PlanFooter /> : null}
        </Card>
    );
}

export function BelowAverage({
    below,
    fmt,
    latest,
}: {
    below: readonly YearChange[];
    fmt: Fmt;
    latest: string | null;
}) {
    const copy = useIntlayer("dashboard-insights-year");
    const categoryName = useCategoryName();
    const saved = below.reduce((sum, each) => sum + Math.max(-each.delta, 0), 0);
    return (
        <Card
            action={
                <span className="dash-figure flex items-baseline gap-2 text-[13px] font-medium">
                    {latest === null ? null : (
                        <span className="text-muted-foreground text-xs font-normal">{fmt.month(latest)}</span>
                    )}
                    {saved > 0 ? <span className={GOOD}>{fmt.whole(saved)}</span> : null}
                </span>
            }
            panelClassName="p-0"
            title={copy.card.below}
        >
            {below.map((each) => {
                const tone = (() => {
                    if (each.delta < 0) {
                        return GOOD;
                    }
                    return each.delta > 0 ? POOR : "";
                })();
                return (
                    <div className={cn(LINE, each.delta >= 0 && "text-muted-foreground font-normal")} key={each.id}>
                        <span className="min-w-0 truncate">{categoryName({ id: each.id, name: each.label })}</span>
                        <span className={cn("dash-figure ml-auto font-normal", tone)}>
                            {each.delta === 0 ? "0" : fmt.signedWhole(each.delta)}
                        </span>
                    </div>
                );
            })}
        </Card>
    );
}

interface HighsProps {
    average: number;
    biggest: YearCategory | undefined;
    fmt: Fmt;
    highest: YearMonth | null;
    judged: number;
    lowest: YearMonth | null;
    over: number;
}

export function HighsAndLows({ average, biggest, fmt, highest, judged, lowest, over }: HighsProps) {
    const copy = useIntlayer("dashboard-insights-year");
    const categoryName = useCategoryName();
    const month = (value: YearMonth | null) =>
        value === null ? null : (
            <>
                <small className="dash-figure text-muted-foreground mr-2 text-xs">{fmt.month(value.key)}</small>
                {fmt.whole(value.spent)}
            </>
        );
    const rows = [
        { id: "highest", label: copy.highest, value: month(highest) },
        { id: "lowest", label: copy.lowest, value: month(lowest) },
        { id: "average", label: copy.monthAverage, value: fmt.whole(average) },
        {
            id: "over",
            label: copy.monthsOver,
            value: judged === 0 ? null : copy.ofTotal({ count: over, total: judged }).value,
        },
        {
            id: "biggest",
            label: copy.biggest,
            value: biggest ? (
                <>
                    <small className="dash-figure text-muted-foreground mr-2 text-xs">
                        {categoryName({ id: biggest.id, name: biggest.label })}
                    </small>
                    {percent(biggest.share)}
                </>
            ) : null,
        },
    ];
    return (
        <Card panelClassName="p-0" title={copy.card.highs}>
            {rows.map((row) => (
                <div className={LINE} key={row.id}>
                    {row.label}
                    <span className="dash-figure ml-auto font-normal">{row.value ?? "-"}</span>
                </div>
            ))}
        </Card>
    );
}
