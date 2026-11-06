import Close from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { merchantKey } from "@outlayr/money/merchant-key";
import { Button } from "panelui-web/button";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { categoryBudget, categoryDetail } from "@/lib/dashboard-series";
import type { CategoryBudget, CategoryDetail } from "@/lib/dashboard-series";
import type { LedgerCategory } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "./catalog";
import { useCategoryName, useDateFormat, useWholeMoney } from "./format";
import { Meter, PanelHeader, PanelSection } from "./panel";

const PERCENT = 100;
const BY_DAY_HEIGHT = 56;
const VERSUS_HEIGHT = 56;

interface Selection {
    budget: CategoryBudget | null;
    detail: CategoryDetail;
    selected: LedgerCategory;
}

function Standing({ budget, detail, selected }: Selection) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const over = budget?.overBudget ?? false;
    const ratio = budget && budget.effectiveLimit > 0 ? budget.spent / budget.effectiveLimit : 1;
    const days = budget?.runOut?.daysEarly ?? 0;
    const ranOutDay = budget?.runOut ? date.day(budget.runOut.day) : "";
    let ranOut: string = copy.onPace.value;
    if (budget?.runOut) {
        if (days === 0) {
            ranOut = copy.ranOutLast({ day: ranOutDay }).value;
        } else if (days === 1) {
            ranOut = copy.ranOutOne({ day: ranOutDay }).value;
        } else {
            ranOut = copy.ranOut({ day: ranOutDay, days }).value;
        }
    }
    return (
        <section className="border-border border-b px-4 py-3.5">
            <p className="font-mono text-[28px] leading-[34px] font-medium tracking-[-0.04em] tabular-nums">
                {money(detail.spent, ledger.currency)}
            </p>
            {budget ? (
                <>
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                        {over
                            ? copy.overBudget({ amount: money(-budget.remaining, ledger.currency) })
                            : copy.left({ amount: money(budget.remaining, ledger.currency) })}
                    </p>
                    <div className="mt-3">
                        <Meter color={over ? "var(--color-destructive)" : selected.color} ratio={ratio} />
                    </div>
                    <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-xs tabular-nums">
                        <span>
                            {money(budget.spent, ledger.currency)} {copy.of}{" "}
                            {money(budget.effectiveLimit, ledger.currency)}
                        </span>
                        <span className={over ? "text-destructive" : undefined}>{Math.round(ratio * PERCENT)}%</span>
                    </div>
                    <p className="text-muted-foreground mt-2.5 text-[13px]">{ranOut}</p>
                </>
            ) : null}
        </section>
    );
}

function ByDay({ detail, selected }: Selection) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    if (detail.count === 0) {
        return null;
    }
    return (
        <PanelSection
            aside={detail.peak ? copy.peak({ day: date.day(detail.peak.date) }) : undefined}
            title={copy.byDay}
        >
            <BarChart
                ariaLabel={copy.byDay.value}
                barGap={0.15}
                compact
                cornerRadius={2}
                data={detail.byDay}
                height={BY_DAY_HEIGHT}
                initialWidth={324}
                xDataKey="date"
            >
                <BarChart.Bar color={selected.color} dataKey="amount" label={selected.name} />
                <BarChart.Track />
                <BarChart.Tooltip
                    formatValue={(value) => money(value, ledger.currency)}
                    formatX={(row) => date.weekday(String(row.date))}
                />
            </BarChart>
        </PanelSection>
    );
}

function Shares({ detail, selected }: Selection) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const imageKeys = useMemo(() => {
        const wanted = new Set(detail.merchants.map((merchant) => merchantKey(merchant.name)));
        const found = new Map<string, string>();
        for (const row of ledger.rows) {
            const name = merchantKey(row.note);
            const book = catalog.transaction(row.id);
            if (row.topId === selected.id && wanted.has(name) && !found.has(name) && book?.imageKey) {
                found.set(name, book.imageKey);
            }
        }
        return found;
    }, [catalog, detail.merchants, ledger.rows, selected.id]);
    const photos = useImageUrls([...new Set(imageKeys.values())].toSorted());
    if (detail.count === 0) {
        return null;
    }
    return (
        <>
            <PanelSection aside={copy.share} title={copy.topMerchants}>
                <ul>
                    {detail.merchants.map((merchant) => {
                        const image = imageKeys.get(merchantKey(merchant.name));
                        return (
                            <li className="flex items-center gap-2.5 py-1.5 text-[13px]" key={merchant.name}>
                                <MerchantTile
                                    imageUrl={image ? photos?.get(image) : undefined}
                                    name={merchant.name}
                                    size="md"
                                />
                                <span className="min-w-0 flex-1 truncate font-medium">{merchant.name}</span>
                                <span className="font-mono text-xs tabular-nums">
                                    {money(merchant.amount, ledger.currency)}
                                </span>
                                <span className="text-muted-foreground w-8 text-right font-mono text-[11px]">
                                    {Math.round(merchant.share * PERCENT)}%
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </PanelSection>
            {detail.byAccount.length > 0 ? (
                <PanelSection aside={copy.share} title={copy.byAccount}>
                    <ul>
                        {detail.byAccount.map((entry) => {
                            const account = catalog.account(entry.id);
                            return (
                                <li className="flex items-center gap-2.5 py-1.5 text-[13px]" key={entry.id ?? "none"}>
                                    {account ? <AccountTile account={account} size="md" /> : null}
                                    <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
                                    <span className="font-mono text-xs tabular-nums">
                                        {money(entry.amount, ledger.currency)}
                                    </span>
                                    <span className="text-muted-foreground w-8 text-right font-mono text-[11px]">
                                        {Math.round(entry.share * PERCENT)}%
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </PanelSection>
            ) : null}
        </>
    );
}

function Versus({ detail, selected }: Selection) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const { whole } = useWholeMoney(ledger.currency);
    if (detail.average === null || detail.versus === null) {
        return null;
    }
    const { average } = detail;
    const data = detail.months.map((month) => ({ amount: month.amount, average, key: month.key }));
    return (
        <PanelSection title={copy.versus}>
            <LineChart
                ariaLabel={copy.versus.value}
                compact
                data={data}
                height={VERSUS_HEIGHT}
                initialWidth={324}
                xDataKey="key"
            >
                <LineChart.Line color={selected.color} dataKey="amount" label={selected.name} strokeWidth={2} />
                <LineChart.Line
                    color="var(--color-muted-foreground)"
                    dashArray="3 3"
                    dataKey="average"
                    strokeWidth={1}
                />
                <LineChart.Tooltip
                    formatValue={(value) => money(value, ledger.currency)}
                    formatX={(row) => date.month(String(row.key))}
                />
            </LineChart>
            <div className="mt-2 flex justify-between font-mono text-xs tabular-nums">
                <span className="text-muted-foreground">{copy.average({ amount: whole(average) })}</span>
                <span className={detail.versus > 0 ? "text-destructive" : "text-app-income"}>
                    {money(detail.versus, ledger.currency, "always")}
                </span>
            </div>
        </PanelSection>
    );
}

export function CategoryPanel() {
    const { filters, ledger, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const categoryName = useCategoryName();
    const { category, period } = filters;
    const selected = category === null ? undefined : ledger.categories.get(category);
    const budget = useMemo(
        () => (category === null || filters.accounts.length > 0 ? null : categoryBudget(ledger, category, period)),
        [category, filters.accounts, ledger, period]
    );
    const detail = useMemo(
        () => (category === null ? null : categoryDetail(ledger, category, period, { accounts: filters.accounts })),
        [category, filters.accounts, ledger, period]
    );
    if (!selected || !detail) {
        return null;
    }
    const selection = { budget, detail, selected };
    return (
        <>
            <PanelHeader>
                <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: selected.color }}
                />
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{categoryName(selected)}</h2>
                <Button
                    aria-label={copy.clearCategory({ name: categoryName(selected) }).value}
                    className="text-muted-foreground"
                    onClick={() => setFilters({ category: null })}
                    size="icon-sm"
                    variant="ghost"
                >
                    <HugeiconsIcon className="size-4" icon={Close} />
                </Button>
            </PanelHeader>
            <Standing {...selection} />
            <ByDay {...selection} />
            <Shares {...selection} />
            <Versus {...selection} />
        </>
    );
}
