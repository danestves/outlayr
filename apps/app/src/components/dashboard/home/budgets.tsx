import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useBudgetFlows } from "@/components/dashboard/budgets/flow-context";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { spendSeries } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import type { BudgetTarget } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";

import { CardFrame } from "./card-frame";
import { Empty } from "./empty";
import { useCategoryName, useWholeMoney } from "./format";
import { budgetRows, rangeBudgets } from "./model";
import type { SetupState } from "./model";

const ROWS_SHOWN = 5;
const PERCENT = 100;
const TRACK_STRENGTH = "18%";
const OVER_BADGE = "normal-nums [&>[data-slot=badge-dot]]:text-inherit";

function Bar({ color, limit, spent }: { color: string; limit: number; spent: number }) {
    const over = spent > limit;
    const own = over ? limit / spent : Math.min(spent / Math.max(limit, 1), 1);
    return (
        <span
            className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
            style={{ backgroundColor: `color-mix(in oklab, ${color} ${TRACK_STRENGTH}, transparent)` }}
        >
            <i className="rounded-full" style={{ backgroundColor: color, width: `${own * PERCENT}%` }} />
            {over ? <i className="bg-app-spend flex-1 rounded-full" /> : null}
        </span>
    );
}

function BudgetRow({ category, standing }: { category: BudgetTarget; standing: CategoryBudget }) {
    const { filters, ledger, setFilters } = useDashboard();
    const { panel: copy } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const name = categoryName(category);
    const dimmed = filters.categories.length > 0 && !filters.categories.includes(category.topId);
    const over = standing.overBudget;
    return (
        <button
            className={`rounded-app-sm hover:bg-app-hover block w-full px-2 py-2 text-start ${dimmed ? "opacity-40" : ""}`}
            onClick={() => setFilters({ category: category.topId })}
            type="button"
        >
            <span className="text-app-label flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{name}</span>
                {over ? (
                    <Badge className={`shrink-0 ${OVER_BADGE}`} dot size="sm" variant="destructive">
                        {copy.overAmount({ amount: money(-standing.remaining, ledger.currency) })}
                    </Badge>
                ) : null}
                <span className="dash-figure text-muted-foreground ms-auto whitespace-nowrap">
                    <b className="text-foreground font-medium">{whole(standing.spent)}</b> /{" "}
                    {whole(standing.effectiveLimit)}
                </span>
            </span>
            <Bar color={category.color} limit={standing.effectiveLimit} spent={standing.spent} />
        </button>
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
    const { over, rows } = useMemo(
        () => budgetRows(ledger, rangeBudgets(ledger, filters.range)),
        [filters.range, ledger]
    );
    if (rows.length === 0) {
        return <NoBudgets setup={setup} />;
    }
    return (
        <CardFrame
            action={
                over > 0 ? (
                    <Badge className={OVER_BADGE} dot variant="destructive">
                        {copy.overCount({ count: over })}
                    </Badge>
                ) : null
            }
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
            <div className="flex flex-col p-2">
                {rows.slice(0, ROWS_SHOWN).map(({ category, standing }) => (
                    <BudgetRow category={category} key={category.id} standing={standing} />
                ))}
            </div>
        </CardFrame>
    );
}
