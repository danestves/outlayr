import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, LookTile } from "@/components/ledger/tiles";
import { endOfDay } from "@/lib/dashboard-series-ledger";
import { netWorthPoints } from "@/lib/dashboard-series-net-worth";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog } from "./catalog";
import { useDateFormat } from "./format";

const ACCOUNT_ROWS = 6;
const UPCOMING_ROWS = 5;
const UPCOMING_DAYS = 30;
const ROW = "flex h-10 items-center gap-2.5 font-medium";

export function Accounts() {
    const { filters, ledger, overview, photos } = useDashboard();
    const copy = useIntlayer("dashboard-home").panel;
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const { period } = filters;
    const closed = period.to < ledger.today;
    const scoped = closed || filters.accounts.length > 0;
    const shown = useMemo(() => {
        if (!scoped) {
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
        const [end] = netWorthPoints(ledger, { accounts: filters.accounts }, [
            closed ? endOfDay(ledger, period.to) : ledger.now,
        ]);
        return {
            net: end?.net ?? 0,
            rows: (end?.accounts ?? []).flatMap(({ balance, id }) => {
                const look = catalog.account(id);
                return look ? [{ balance, key: id, look, name: ledger.accounts.get(id)?.name ?? "" }] : [];
            }),
        };
    }, [catalog, closed, filters.accounts, ledger, overview.balances, period.to, scoped]);
    const horizon = addDays(ledger.today, UPCOMING_DAYS);
    const charges = overview.upcoming.charges.filter((charge) => charge.nextCharge <= horizon).slice(0, UPCOMING_ROWS);
    return (
        <section className="dash-card text-sm">
            <div className="dash-card-head">
                <h2>{copy.accounts}</h2>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {money(shown.net, ledger.currency)}
                </span>
            </div>
            <div className="flex-1 px-5 pb-2">
                {shown.rows.length === 0 && charges.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-[13px]">{copy.noAccounts}</p>
                ) : null}
                {shown.rows.slice(0, ACCOUNT_ROWS).map((account) => (
                    <div className={ROW} key={account.key}>
                        <AccountTile account={account.look} photos={photos} size="lg" />
                        <span className="min-w-0 truncate">{account.name}</span>
                        <span className="dash-figure ml-auto">{money(account.balance, ledger.currency)}</span>
                    </div>
                ))}
                {shown.rows.length > ACCOUNT_ROWS ? (
                    <p className="text-muted-foreground pt-1 text-xs">
                        {copy.moreAccounts({ count: shown.rows.length - ACCOUNT_ROWS })}
                    </p>
                ) : null}
                {charges.length > 0 ? (
                    <>
                        <div className="bg-border -mx-5 my-2 h-px" />
                        <div className="text-muted-foreground pt-1.5 pb-0.5 text-xs leading-4">{copy.upcoming}</div>
                        {charges.map((charge) => {
                            const value =
                                charge.valued === null
                                    ? { amount: charge.amount, currency: charge.currency }
                                    : { amount: charge.valued, currency: overview.upcoming.currency };
                            return (
                                <div className={ROW} key={charge.id}>
                                    <LookTile look={charge.look} photos={photos} plain size="lg" />
                                    <span className="min-w-0 truncate">{charge.note}</span>
                                    <span className="dash-figure text-muted-foreground text-[13px] font-normal whitespace-nowrap">
                                        {date.day(charge.nextCharge)}
                                    </span>
                                    <span
                                        className={`dash-figure ml-auto ${charge.kind === "income" ? "text-app-income" : ""}`}
                                    >
                                        {money(value.amount, value.currency)}
                                    </span>
                                </div>
                            );
                        })}
                    </>
                ) : null}
            </div>
        </section>
    );
}
