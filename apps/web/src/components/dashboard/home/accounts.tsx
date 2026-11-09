import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, LookTile } from "@/components/ledger/tiles";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { useCatalog } from "./catalog";
import { useDateFormat } from "./format";
import { accountBalances } from "./model";
import type { SetupState } from "./model";
import { Cover, GhostAccounts } from "./setup";

const ACCOUNT_ROWS = 6;
const UPCOMING_ROWS = 5;
const UPCOMING_DAYS = 30;
const ROW = "flex h-10 items-center gap-2.5 font-medium";

export function Accounts({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger, overview, photos } = useDashboard();
    const { open } = useAccountFlows();
    const { panel: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const { period } = filters;
    const closed = !quiet && period.to < ledger.today;
    const scoped = closed || filters.accounts.length > 0;
    const shown = useMemo(() => {
        if (!scoped) {
            const { accounts, net } = overview.balances;
            return {
                net,
                rows: accounts.map((account, index) => ({
                    balance: account.balanceInMainCurrency,
                    dimmed: false,
                    key: `${index}-${account.name}`,
                    look: account.look,
                    name: account.name,
                })),
            };
        }
        const every = accountBalances(ledger, period, quiet, []);
        const picked = filters.accounts;
        const end = picked.length > 0 ? accountBalances(ledger, period, quiet, picked) : every;
        return {
            net: end.net,
            rows: every.accounts.flatMap(({ balance, id }) => {
                const look = catalog.account(id);
                const dimmed = picked.length > 0 && !picked.includes(id);
                return look ? [{ balance, dimmed, key: id, look, name: ledger.accounts.get(id)?.name ?? "" }] : [];
            }),
        };
    }, [catalog, filters.accounts, ledger, overview.balances, period, quiet, scoped]);
    const listed = (
        shown.rows.length > ACCOUNT_ROWS
            ? shown.rows.toSorted((a, b) => Number(a.dimmed) - Number(b.dimmed))
            : shown.rows
    ).slice(0, ACCOUNT_ROWS);
    const horizon = addDays(ledger.today, UPCOMING_DAYS);
    const charges = overview.upcoming.charges
        .filter(
            (charge) =>
                charge.nextCharge <= horizon &&
                (filters.accounts.length === 0 || filters.accounts.includes(charge.accountId ?? ""))
        )
        .slice(0, UPCOMING_ROWS);
    if (setup?.step === "account") {
        return (
            <CardFrame className="ring-primary/55 relative min-h-[375px] text-sm ring-1" title={copy.accounts}>
                <GhostAccounts />
                <Cover
                    line={
                        setup.spent > 0
                            ? setupCopy.accountFrom({ amount: money(setup.spent, ledger.currency) })
                            : setupCopy.accountLine
                    }
                    title={setupCopy.accountTitle}
                >
                    <Button onClick={() => open({ kind: "create", type: "bank" })}>
                        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                        {setupCopy.addAccount}
                    </Button>
                </Cover>
            </CardFrame>
        );
    }
    return (
        <CardFrame
            action={
                setup ? null : (
                    <span className="dash-figure text-muted-foreground block truncate text-[13px]">
                        {money(shown.net, ledger.currency)}
                    </span>
                )
            }
            className={`text-sm ${setup ? "" : "@4xl:self-start"}`}
            title={
                <Link className="hover:text-app-tint" to="/app/accounts">
                    {copy.accounts}
                </Link>
            }
        >
            <div className="px-3.5 py-1.5">
                {shown.rows.length === 0 && charges.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-[13px]">{copy.noAccounts}</p>
                ) : null}
                {listed.map((account) => (
                    <div
                        className={`flex min-h-10 flex-wrap items-center gap-x-2.5 font-medium ${account.dimmed ? "opacity-40" : ""}`}
                        key={account.key}
                    >
                        <AccountTile account={account.look} photos={photos} size="lg" />
                        <span className="min-w-18 flex-[1_1_0] truncate">{account.name}</span>
                        <span className="dash-figure ml-auto whitespace-nowrap">
                            {money(account.balance, ledger.currency)}
                        </span>
                    </div>
                ))}
                {shown.rows.length > ACCOUNT_ROWS ? (
                    <p className="text-muted-foreground pt-1 text-xs">
                        {copy.moreAccounts({ count: shown.rows.length - ACCOUNT_ROWS })}
                    </p>
                ) : null}
                {shown.rows.length === 1 && !setup ? (
                    <Link className={`${ROW} text-muted-foreground hover:text-foreground`} to="/app/accounts">
                        <span className="bg-app-fill flex size-[26px] items-center justify-center rounded-lg">
                            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
                        </span>
                        {copy.addAnAccount}
                    </Link>
                ) : null}
                {charges.length > 0 ? (
                    <>
                        <div className="bg-border -mx-3.5 my-1.5 h-px" />
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
        </CardFrame>
    );
}
