import { RiAddLine } from "@remixicon/react";
import { Stat } from "panelui-web/stat";
import { Usage } from "panelui-web/usage";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useWide } from "@/components/dashboard/insights/use-wide";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { budgetParts, categoryBudgets } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import type { BudgetTarget } from "@/lib/dashboard-series-ledger";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { useCategoryName, useDateFormat, useWholeMoney } from "./format";
import { budgetRows } from "./model";
import type { SetupState } from "./model";
import { Cover, GhostBudgets, PhoneButton } from "./setup";

const ROWS_SHOWN = 5;
const PERCENT = 100;
const TONE_STRENGTHS = [100, 62, 38, 24] as const;
const NEVER_CRITICAL = 1.1;
const USAGE_LOCALE = "en-US";

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
        () => budgetParts(ledger, category.id, standing, filters.period),
        [category.id, filters.period, ledger, standing]
    );
    const name = categoryName(category);
    const over = standing.overBudget;
    const overAmount = copy.overAmount({ amount: money(-standing.remaining, ledger.currency) });
    const figures = { critical: over ? 0 : NEVER_CRITICAL, format, label: name, limit: standing.effectiveLimit };
    const filter = () => setFilters({ category: category.topId });
    const percent = Math.round((standing.spent / Math.max(standing.effectiveLimit, 1)) * PERCENT);
    const badge = (
        <span className="dash-badge h-5 shrink-0" data-tone="bad">
            <u />
            {overAmount}
        </span>
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
        <div className="flex h-9 items-center gap-1.5 max-lg:h-11">
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
                        <button
                            className="dash-ob text-foreground"
                            onClick={() => {
                                setOpen(false);
                                filter();
                            }}
                            type="button"
                        >
                            {copy.budgetFilter}
                        </button>
                    </Usage.Footer>
                </Usage.Content>
            </Usage>
            <button
                className="flex h-full min-w-0 flex-1 items-center gap-2 pr-1.5 text-left text-[13px] font-medium"
                onClick={filter}
                type="button"
            >
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {over ? (
                    badge
                ) : (
                    <span className="dash-figure text-muted-foreground text-xs leading-4 whitespace-nowrap">
                        <b className="text-foreground font-medium">{whole(standing.spent)}</b> /{" "}
                        {whole(standing.effectiveLimit)}
                    </span>
                )}
            </button>
        </div>
    );
}

export function Budgets({ setup }: { setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const { panel: copy, setup: setupCopy, transactions } = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const { whole } = useWholeMoney(ledger.currency);
    const [expanded, setExpanded] = useState(false);
    const { left, limit, over, rows } = useMemo(
        () => budgetRows(ledger, categoryBudgets(ledger, filters.period)),
        [filters.period, ledger]
    );
    if (setup && rows.length === 0) {
        const active = setup.step === "budget";
        const first = setup.firstSpendTopId ? ledger.categories.get(setup.firstSpendTopId) : undefined;
        return (
            <CardFrame className={`min-h-[363px] ${active ? "ring-primary/55 ring-1" : ""}`} title={copy.budgets}>
                <GhostBudgets />
                <Cover
                    line={first ? setupCopy.budgetFirstSpend({ name: categoryName(first) }) : setupCopy.budgetLine}
                    title={copy.budgetsEmptyTitle}
                >
                    <PhoneButton className={active ? "dash-btn" : "dash-ob h-[34px] px-3"}>
                        <RiAddLine size={active ? 18 : 15} />
                        {setupCopy.addBudget}
                    </PhoneButton>
                </Cover>
            </CardFrame>
        );
    }
    if (rows.length === 0) {
        return (
            <CardFrame title={copy.budgets}>
                <div className="dash-empty h-full">
                    <b className="text-[15px] font-semibold">{copy.budgetsEmptyTitle}</b>
                    <p className="text-muted-foreground text-[13px]">{copy.budgetsEmptyLine}</p>
                </div>
            </CardFrame>
        );
    }
    return (
        <CardFrame
            footer={
                <>
                    <span className="text-muted-foreground text-[13px]">{copy.onTrackLabel}</span>
                    <span className="dash-figure font-medium">
                        {copy.onTrackCount({ count: rows.length - over, total: rows.length })}
                    </span>
                    {rows.length > ROWS_SHOWN ? (
                        <button className="dash-ob ml-auto" onClick={() => setExpanded(!expanded)} type="button">
                            {expanded ? copy.budgetShowLess : transactions.seeAll}
                        </button>
                    ) : null}
                </>
            }
            title={copy.budgets}
        >
            <Stat className="px-3.5 pt-[11px] pb-[7px]">
                <Stat.Content>
                    <Stat.Label className="text-[13px] leading-[18px]">
                        {left < 0 ? copy.budgetOverTotal : copy.budgetLeft}
                    </Stat.Label>
                    <Stat.Value
                        className={`dash-figure tracking-[-0.04em] ${left < 0 ? "text-[color-mix(in_oklab,var(--color-app-spend),var(--color-app-ink)_30%)]" : ""}`}
                        size="sm"
                    >
                        {whole(Math.abs(left))}
                        <Stat.Unit className="font-sans tracking-normal">
                            {copy.of} {whole(limit)}
                        </Stat.Unit>
                    </Stat.Value>
                </Stat.Content>
                {over > 0 ? (
                    <span className="dash-badge" data-tone="bad">
                        <u />
                        {copy.overCount({ count: over })}
                    </span>
                ) : null}
            </Stat>
            <div className="px-2 pb-0.5">
                {(expanded ? rows : rows.slice(0, ROWS_SHOWN)).map(({ category, standing }) => (
                    <BudgetRow category={category} key={category.id} standing={standing} />
                ))}
            </div>
        </CardFrame>
    );
}
