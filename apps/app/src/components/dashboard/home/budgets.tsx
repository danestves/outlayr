import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Stat } from "panelui-web/stat";
import { Usage } from "panelui-web/usage";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useBudgetFlows } from "@/components/dashboard/budgets/flow-context";
import { useWide } from "@/components/dashboard/insights/use-wide";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { budgetParts, spendSeries } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import type { BudgetTarget } from "@/lib/dashboard-series-ledger";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";

import { CardFrame } from "./card-frame";
import { Empty } from "./empty";
import { useCategoryName, useDateFormat, useWholeMoney } from "./format";
import { budgetRows, rangeBudgets } from "./model";
import type { SetupState } from "./model";

const ROWS_SHOWN = 5;
const PERCENT = 100;
const TONE_STRENGTHS = [100, 62, 38, 24] as const;
const NEVER_CRITICAL = 1.1;
const USAGE_LOCALE = "en-US";
const OVER_BADGE = "normal-nums [&>[data-slot=badge-dot]]:text-inherit";

function BudgetRow({ category, standing }: { category: BudgetTarget; standing: CategoryBudget }) {
    const { filters, ledger, setFilters } = useDashboard();
    const { panel: copy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const wide = useWide();
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const [open, setOpen] = useState(false);
    const format = useMemo(
        () => ({ currency: ledger.currency, maximumFractionDigits: 0, style: "currency" }) as const,
        [ledger.currency]
    );
    const parts = useMemo(
        () => budgetParts(ledger, category.id, standing, filters.range),
        [category.id, filters.range, ledger, standing]
    );
    const name = categoryName(category);
    const dimmed = filters.categories.length > 0 && !filters.categories.includes(category.topId);
    const over = standing.overBudget;
    const overAmount = copy.overAmount({ amount: money(-standing.remaining, ledger.currency) });
    const figures = { critical: over ? 0 : NEVER_CRITICAL, format, label: name, limit: standing.effectiveLimit };
    const filter = () => setFilters({ category: category.topId });
    const percent = Math.round((standing.spent / Math.max(standing.effectiveLimit, 1)) * PERCENT);
    const badge = (
        <Badge className={`ms-auto shrink-0 ${OVER_BADGE}`} dot variant="destructive">
            {overAmount}
        </Badge>
    );
    const summary = (
        <>
            <Usage.Summary
                className={over ? "[&>div:first-child>span]:hidden" : undefined}
                label={
                    <span className={`flex items-center gap-2 ${over ? "max-w-72" : "max-w-56"}`}>
                        <span className="truncate">{name}</span>
                        {over ? badge : null}
                    </span>
                }
            />
            {parts.length > 0 ? <Usage.Breakdown freeLabel={over ? null : copy.budgetLeft} /> : null}
        </>
    );
    let note: ReactNode = null;
    if (standing.runOut && standing.runOut.daysEarly > 0) {
        const { day, daysEarly } = standing.runOut;
        note =
            daysEarly === 1
                ? copy.ranOutOne({ day: date.day(day) })
                : copy.ranOut({ day: date.day(day), days: String(daysEarly) });
    } else if (standing.to < ledger.today) {
        note = copy.budgetEnded({ day: date.day(standing.to) });
    } else if (standing.period !== null) {
        note = copy.budgetResets({ day: date.day(addDays(standing.to, 1)) });
    }
    return (
        <div className={`flex min-h-9 items-center gap-1.5 max-lg:min-h-11 ${dimmed ? "opacity-40" : ""}`}>
            <Usage {...figures} locales={USAGE_LOCALE} onOpenChange={setOpen} open={open} value={standing.spent}>
                <Usage.Trigger
                    aria-label={
                        over
                            ? `${name}: ${overAmount.value}`
                            : copy.budgetUsed({ name, percent: String(percent) }).value
                    }
                    className="max-lg:after:absolute max-lg:after:-inset-1.5 [&_*]:animate-none!"
                />
                <Usage.Content align="start" className="app-shell ph-no-capture" side={wide ? "left" : "bottom"}>
                    {parts.length > 0 ? (
                        <Usage
                            {...figures}
                            locales={USAGE_LOCALE}
                            segments={parts.map((part, index) => ({
                                color: `color-mix(in oklab, var(--usage-tone) ${TONE_STRENGTHS[Math.min(index, TONE_STRENGTHS.length - 1)]}%, transparent)`,
                                label:
                                    part.name === null
                                        ? copy.noSubcategory.value
                                        : categoryName({ id: part.id, name: part.name }),
                                value: part.amount,
                            }))}
                        >
                            {summary}
                        </Usage>
                    ) : (
                        summary
                    )}
                    <Usage.Footer>
                        <span>{note}</span>
                        <Button
                            onClick={() => {
                                setOpen(false);
                                filter();
                            }}
                            size="sm"
                            variant="outline"
                        >
                            {copy.budgetFilter}
                        </Button>
                    </Usage.Footer>
                </Usage.Content>
            </Usage>
            <button
                className="text-app-label flex min-w-0 flex-1 flex-wrap items-center gap-x-2 self-stretch py-1 pr-1.5 text-start font-medium"
                onClick={filter}
                type="button"
            >
                <span className="min-w-18 flex-1 truncate">{name}</span>
                {over ? (
                    badge
                ) : (
                    <span className="dash-figure text-muted-foreground text-app-caption ms-auto font-normal whitespace-nowrap">
                        <b className="text-foreground font-medium">{whole(standing.spent)}</b> /{" "}
                        {whole(standing.effectiveLimit)}
                    </span>
                )}
            </button>
        </div>
    );
}

function NoBudgets({ setup }: { setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { panel: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const { open } = useBudgetFlows();
    const biggest = useMemo(() => {
        if (setup) {
            return setup.firstSpendTopId ? ledger.categories.get(setup.firstSpendTopId) : undefined;
        }
        const { categories } = spendSeries(ledger, filters.range, { accounts: filters.accounts, category: null });
        const [top] = categories.toSorted((a, b) => b.total - a.total);
        return top ? ledger.categories.get(top.id) : undefined;
    }, [filters.accounts, filters.range, ledger, setup]);
    let line: ReactNode = copy.budgetsEmptyLine;
    if (biggest) {
        line = setup
            ? setupCopy.budgetFirstSpend({ name: categoryName(biggest) })
            : copy.budgetBiggest({ name: categoryName(biggest) });
    }
    return (
        <CardFrame highlighted={setup?.step === "budget"} title={copy.budgets}>
            <Empty
                action={
                    <Button
                        onClick={() => open({ categoryId: biggest?.id ?? null, kind: "new" })}
                        variant={!setup || setup.step === "budget" ? "default" : "outline"}
                    >
                        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                        {setupCopy.addBudget}
                    </Button>
                }
                icon={PieChartIcon}
                line={line}
                title={copy.budgetsEmptyTitle}
            />
        </CardFrame>
    );
}

export function Budgets({ setup }: { setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { panel: copy } = useIntlayer("dashboard-home");
    const { whole } = useWholeMoney(ledger.currency);
    const { left, limit, over, rows } = useMemo(
        () => budgetRows(ledger, rangeBudgets(ledger, filters.range)),
        [filters.range, ledger]
    );
    if (rows.length === 0) {
        return <NoBudgets setup={setup} />;
    }
    return (
        <CardFrame
            footer={
                <>
                    <span className="text-muted-foreground text-app-label">{copy.onTrackLabel}</span>
                    <span className="dash-figure font-medium">
                        {copy.onTrackCount({ count: rows.length - over, total: rows.length })}
                    </span>
                    <Button
                        className="[&_svg]:text-muted-foreground ms-auto gap-1.5"
                        nativeButton={false}
                        render={<Link to="/budgets" viewTransition={viewTransition("push-left")} />}
                        size="sm"
                        variant="outline"
                    >
                        {copy.details}
                        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.5} />
                    </Button>
                </>
            }
            title={copy.budgets}
        >
            <Stat className="flex-wrap gap-y-1 px-3.5 pt-3 pb-2">
                <Stat.Content>
                    <Stat.Label className="text-app-label">
                        {left < 0 ? copy.budgetOverTotal : copy.budgetLeft}
                    </Stat.Label>
                    <Stat.Value className={`dash-figure tracking-tight ${left < 0 ? "text-app-spend" : ""}`} size="sm">
                        {whole(Math.abs(left))}
                        <Stat.Unit className="text-app-label ms-1.5 font-sans leading-none tracking-normal normal-nums">
                            {copy.of} {whole(limit)}
                        </Stat.Unit>
                    </Stat.Value>
                </Stat.Content>
                {over > 0 ? (
                    <Badge className={OVER_BADGE} dot variant="destructive">
                        {copy.overCount({ count: over })}
                    </Badge>
                ) : null}
            </Stat>
            <div className="px-2 pb-0.5">
                {rows.slice(0, ROWS_SHOWN).map(({ category, standing }) => (
                    <BudgetRow category={category} key={category.id} standing={standing} />
                ))}
            </div>
        </CardFrame>
    );
}
