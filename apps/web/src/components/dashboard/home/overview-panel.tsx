import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, LookTile } from "@/components/ledger/tiles";
import { categoryBudgets, spendSeries } from "@/lib/dashboard-series";
import { endOfDay } from "@/lib/dashboard-series-ledger";
import { netWorthPoints } from "@/lib/dashboard-series-net-worth";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { cn } from "@/lib/utils";

import { useCatalog } from "./catalog";
import { useCategoryName, useDateFormat, usePeriodTitle } from "./format";
import { Meter, PanelHeader, PanelSection } from "./panel";

const BUDGET_ROWS = 8;
const ACCOUNT_ROWS = 6;
const UPCOMING_ROWS = 5;
const UPCOMING_DAYS = 30;

function Budgets() {
    const { filters, ledger, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const { period } = filters;
    const rows = useMemo(() => {
        const standings = categoryBudgets(ledger, period);
        const spent = spendSeries(ledger, period, { accounts: filters.accounts, category: null }).categories;
        const budgeted = [...standings].flatMap(([id, standing]) => {
            const category = ledger.budgetTargets.get(id);
            return category ? [{ category, standing }] : [];
        });
        const unbudgeted = spent.filter((each) => !standings.has(each.id) && each.total > 0);
        return {
            budgeted: budgeted.toSorted((a, b) => b.standing.spent - a.standing.spent),
            over: budgeted.filter((each) => each.standing.overBudget).length,
            unbudgeted: unbudgeted.toSorted((a, b) => b.total - a.total),
        };
    }, [filters.accounts, ledger, period]);
    if (filters.accounts.length > 0 || (rows.budgeted.length === 0 && rows.unbudgeted.length === 0)) {
        return null;
    }
    return (
        <PanelSection
            aside={
                rows.budgeted.length > 0
                    ? copy.onTrack({ count: rows.budgeted.length - rows.over, total: rows.budgeted.length })
                    : undefined
            }
            title={copy.budgets}
        >
            <ul>
                {rows.budgeted.map(({ category, standing }) => (
                    <li className="-mx-2" key={category.id}>
                        <button
                            className="hover:bg-muted block w-full cursor-pointer rounded-lg px-2 py-2 text-left transition-colors"
                            onClick={() => setFilters({ category: category.topId })}
                            type="button"
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <LookTile look={catalog.category(category.id)} size="sm" />
                                <span className="min-w-0 flex-1 truncate font-medium">{categoryName(category)}</span>
                                <span className="font-mono text-xs tabular-nums">
                                    {standing.overBudget ? (
                                        <span className="text-destructive">
                                            {money(-standing.remaining, ledger.currency)} {copy.over}
                                        </span>
                                    ) : (
                                        <>
                                            {money(standing.spent, ledger.currency)}{" "}
                                            <span className="text-muted-foreground">
                                                {copy.of} {money(standing.effectiveLimit, ledger.currency)}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </span>
                            <span className="mt-2 block pl-7">
                                <Meter
                                    color={category.color}
                                    ratio={standing.effectiveLimit > 0 ? standing.spent / standing.effectiveLimit : 1}
                                    thin
                                />
                            </span>
                        </button>
                    </li>
                ))}
                {rows.unbudgeted.slice(0, Math.max(BUDGET_ROWS - rows.budgeted.length, 0)).map((each) => (
                    <li className="-mx-2" key={each.id}>
                        <button
                            className="hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors"
                            onClick={() => setFilters({ category: each.id })}
                            type="button"
                        >
                            <LookTile look={catalog.category(each.id)} size="sm" />
                            <span className="min-w-0 flex-1 truncate font-medium">{categoryName(each)}</span>
                            <span className="font-mono text-xs tabular-nums">
                                {money(each.total, ledger.currency)}{" "}
                                <span className="text-muted-foreground">{copy.noBudget}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </PanelSection>
    );
}

function Accounts() {
    const { filters, ledger, overview, photos } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const { period } = filters;
    const closed = period.to < ledger.today;
    const shown = useMemo(() => {
        if (!closed) {
            const { accounts, net } = overview.balances;
            return {
                net,
                rows: accounts.map((account, index) => ({
                    balance: account.balanceInMainCurrency,
                    key: `${index}-${account.name}`,
                    look: account.look,
                    name: account.name,
                })),
            };
        }
        const [end] = netWorthPoints(ledger, { accounts: [] }, [endOfDay(ledger, period.to)]);
        return {
            net: end?.net ?? 0,
            rows: (end?.accounts ?? []).flatMap(({ balance, id }) => {
                const look = catalog.account(id);
                return look ? [{ balance, key: id, look, name: ledger.accounts.get(id)?.name ?? "" }] : [];
            }),
        };
    }, [catalog, closed, ledger, overview.balances, period.to]);
    if (shown.rows.length === 0) {
        return null;
    }
    return (
        <PanelSection
            aside={
                closed
                    ? copy.netOn({ amount: money(shown.net, ledger.currency), day: date.day(period.to) })
                    : copy.net({ amount: money(shown.net, ledger.currency) })
            }
            title={copy.accounts}
        >
            <ul>
                {shown.rows.slice(0, ACCOUNT_ROWS).map((account) => (
                    <li className="flex items-center gap-2 py-2 text-sm" key={account.key}>
                        <AccountTile account={account.look} photos={photos} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
                        <span className="font-mono text-sm tabular-nums">
                            {money(account.balance, ledger.currency)}
                        </span>
                    </li>
                ))}
            </ul>
            {shown.rows.length > ACCOUNT_ROWS ? (
                <p className="text-muted-foreground pt-2 text-xs">
                    {copy.moreAccounts({ count: shown.rows.length - ACCOUNT_ROWS })}
                </p>
            ) : null}
        </PanelSection>
    );
}

function Upcoming() {
    const { ledger, overview, photos } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const horizon = addDays(ledger.today, UPCOMING_DAYS);
    const charges = overview.upcoming.charges.filter((charge) => charge.nextCharge <= horizon).slice(0, UPCOMING_ROWS);
    if (charges.length === 0) {
        return null;
    }
    return (
        <PanelSection aside={copy.upcomingWindow} title={copy.upcoming}>
            <ul>
                {charges.map((charge) => {
                    const shown =
                        charge.valued === null
                            ? { amount: charge.amount, currency: charge.currency }
                            : { amount: charge.valued, currency: overview.upcoming.currency };
                    return (
                        <li className="flex items-center gap-2 py-2 text-sm" key={charge.id}>
                            <LookTile look={charge.look} photos={photos} size="sm" />
                            <span className="min-w-0 flex-1 truncate font-medium">{charge.note}</span>
                            <span
                                className={cn(
                                    "font-mono text-sm tabular-nums",
                                    charge.kind === "income" && "text-app-income"
                                )}
                            >
                                {money(
                                    charge.kind === "income" ? shown.amount : -shown.amount,
                                    shown.currency,
                                    "always"
                                )}
                            </span>
                            <span className="text-muted-foreground w-12 text-right font-mono text-xs">
                                {date.day(charge.nextCharge)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </PanelSection>
    );
}

export function OverviewPanel() {
    const { filters, ledger } = useDashboard();
    const title = usePeriodTitle(ledger.firstDayOfMonth);
    return (
        <>
            <PanelHeader>
                <h2 className="text-sm font-medium">{title(filters.period)}</h2>
            </PanelHeader>
            <Budgets />
            <Accounts />
            <Upcoming />
        </>
    );
}
