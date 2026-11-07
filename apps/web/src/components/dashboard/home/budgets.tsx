import { RiArrowRightUpLine } from "@remixicon/react";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudgets } from "@/lib/dashboard-series";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName, useWholeMoney } from "./format";
import { budgetFill, budgetRows } from "./model";

const ROWS_SHOWN = 5;
const PERCENT = 100;

export function Budgets() {
    const { filters, ledger, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    const { over, rows } = useMemo(
        () => budgetRows(ledger, categoryBudgets(ledger, filters.period)),
        [filters.period, ledger]
    );
    return (
        <section className="dash-card">
            <div className="dash-card-head">
                <h2>{copy.budgets}</h2>
                {over > 0 ? (
                    <span className="dash-badge ml-auto" data-tone="bad">
                        <u />
                        {copy.overCount({ count: over })}
                    </span>
                ) : null}
            </div>
            {rows.length === 0 ? (
                <div className="dash-empty">
                    <b className="text-[15px] font-semibold">{copy.budgetsEmptyTitle}</b>
                    <p className="text-muted-foreground text-[13px]">{copy.budgetsEmptyLine}</p>
                </div>
            ) : (
                <div className="flex-1 px-5 pb-[18px]">
                    {rows.slice(0, ROWS_SHOWN).map(({ category, standing }, index) => (
                        <button
                            className={`block w-full text-left ${index === 0 ? "" : "pt-3"}`}
                            key={category.id}
                            onClick={() => setFilters({ category: category.topId })}
                            type="button"
                        >
                            <span className="flex items-center gap-[7px] text-[13px] font-medium">
                                <span className="truncate">{categoryName(category)}</span>
                                {standing.overBudget ? (
                                    <span className="dash-badge h-5" data-tone="bad">
                                        <u />
                                        {copy.overAmount({ amount: money(-standing.remaining, ledger.currency) })}
                                    </span>
                                ) : null}
                                <span className="dash-figure text-muted-foreground ml-auto text-xs leading-4 whitespace-nowrap">
                                    <b className="text-foreground font-medium">{whole(standing.spent)}</b> /{" "}
                                    {whole(standing.effectiveLimit)}
                                </span>
                            </span>
                            <span
                                className="mt-[7px] flex h-2 gap-0.5 overflow-hidden rounded-full"
                                style={{ backgroundColor: `color-mix(in oklab, ${category.color} 22%, transparent)` }}
                            >
                                <i
                                    className="block h-full rounded-full"
                                    style={{
                                        backgroundColor: category.color,
                                        width: `${budgetFill(standing) * PERCENT}%`,
                                    }}
                                />
                                {standing.overBudget ? (
                                    <i className="bg-app-spend block h-full flex-1 rounded-full" />
                                ) : null}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {rows.length === 0 ? null : (
                <div className="dash-card-foot">
                    <span className="text-muted-foreground text-[13px]">{copy.onTrackLabel}</span>
                    <span className="dash-figure text-sm font-medium">
                        {copy.onTrackCount({ count: rows.length - over, total: rows.length })}
                    </span>
                    <span aria-disabled className="dash-ob ml-auto">
                        {copy.details}
                        <RiArrowRightUpLine size={15} />
                    </span>
                </div>
            )}
        </section>
    );
}
