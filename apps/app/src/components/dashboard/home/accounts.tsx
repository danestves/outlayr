import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, LookTile, MerchantTile } from "@/components/ledger/tiles";
import { addDays } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";
import { photoSrc } from "@/lib/photo-src";

import { CardFrame } from "./card-frame";
import { useCatalog } from "./catalog";
import { Empty } from "./empty";
import { useDateFormat } from "./format";
import { accountBalances } from "./model";
import type { SetupState } from "./model";

const ACCOUNT_ROWS = 6;
const UPCOMING_ROWS = 5;
const UPCOMING_DAYS = 30;
const ROW = "flex h-10 items-center gap-2.5 font-medium";

export function Accounts({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger, overview } = useDashboard();
    const { open } = useAccountFlows();
    const { panel: copy, setup: setupCopy } = useIntlayer("dashboard-home");
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const period = filters.range;
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
            <CardFrame highlighted title={copy.accounts}>
                <Empty
                    action={
                        <Button onClick={() => open({ kind: "create", type: "bank" })}>
                            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                            {setupCopy.addAccount}
                        </Button>
                    }
                    icon={CreditCardIcon}
                    line={
                        setup.spent > 0
                            ? setupCopy.accountFrom({ amount: money(setup.spent, ledger.currency) })
                            : setupCopy.accountLine
                    }
                    title={setupCopy.accountTitle}
                />
            </CardFrame>
        );
    }
    return (
        <CardFrame
            action={
                setup ? null : (
                    <span className="dash-figure text-muted-foreground text-app-label block truncate">
                        {money(shown.net, ledger.currency)}
                    </span>
                )
            }
            className="text-app-body"
            title={
                <Link className="hover:text-app-tint" to="/accounts" viewTransition={viewTransition("push-left")}>
                    {copy.accounts}
                </Link>
            }
        >
            <div className="px-4 pt-1.5 pb-2">
                {shown.rows.length === 0 && charges.length === 0 ? (
                    <p className="text-muted-foreground text-app-label py-6">{copy.noAccounts}</p>
                ) : null}
                {listed.map((account) => (
                    <div
                        className={`flex min-h-10 flex-wrap items-center gap-x-2.5 font-medium ${account.dimmed ? "opacity-40" : ""}`}
                        key={account.key}
                    >
                        <AccountTile account={account.look} size="lg" />
                        <span className="min-w-18 flex-[1_1_0] truncate">{account.name}</span>
                        <span className="dash-figure ml-auto whitespace-nowrap">
                            {money(account.balance, ledger.currency)}
                        </span>
                    </div>
                ))}
                {shown.rows.length > ACCOUNT_ROWS ? (
                    <p className="text-muted-foreground text-app-caption pt-1">
                        {copy.moreAccounts({ count: shown.rows.length - ACCOUNT_ROWS })}
                    </p>
                ) : null}
                {shown.rows.length === 1 && !setup ? (
                    <button
                        className={`${ROW} text-muted-foreground hover:text-foreground w-full text-start`}
                        onClick={() => open({ kind: "create", type: "bank" })}
                        type="button"
                    >
                        <span className="bg-app-fill rounded-app-sm flex size-6.5 items-center justify-center">
                            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
                        </span>
                        {copy.addAnAccount}
                    </button>
                ) : null}
                {charges.length > 0 ? (
                    <>
                        <div className="bg-border -mx-4 my-2 h-px" />
                        <div className="text-muted-foreground text-app-caption pt-1.5 pb-0.5">{copy.upcoming}</div>
                        {charges.map((charge) => {
                            const value =
                                charge.valued === null
                                    ? { amount: charge.amount, currency: charge.currency }
                                    : { amount: charge.valued, currency: overview.upcoming.currency };
                            return (
                                <div className={ROW} key={charge.id}>
                                    {charge.look.icon || charge.look.emoji ? (
                                        <LookTile look={charge.look} plain size="lg" />
                                    ) : (
                                        <MerchantTile
                                            imageUrl={photoSrc(charge.look.imageKey)}
                                            name={charge.note}
                                            size="lg"
                                        />
                                    )}
                                    <span className="min-w-0 truncate">{charge.note}</span>
                                    <span className="dash-figure text-muted-foreground text-app-label font-normal whitespace-nowrap">
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
