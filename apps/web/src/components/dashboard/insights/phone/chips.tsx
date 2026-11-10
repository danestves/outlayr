import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Sheet } from "panelui-web/sheet";
import { useMemo, useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { titled } from "@/components/dashboard/home/format";
import { accountBalances } from "@/components/dashboard/home/model";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { usePeriodKeys } from "@/components/dashboard/shell/period-keys";
import { AccountTile } from "@/components/ledger/tiles";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useInsightsFormat } from "../format";
import { FIGURE } from "../parts";

// The pill is 34px tall; the pseudo-element takes the tap out to 44.
const CHIP =
    "border-border hover:bg-app-hover relative flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-[13px] text-sm font-medium whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-[5px]";
const ROW = "hover:bg-app-hover flex h-11 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-sm";

function Chevron() {
    return <HugeiconsIcon className="text-muted-foreground" icon={ArrowDown01Icon} size={16} strokeWidth={2} />;
}

export function PeriodChip() {
    const dashboard = useDashboard();
    const { filters, ledger, setFilters } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const { locale } = useLocale();
    const fmt = useInsightsFormat(ledger);
    const keys = usePeriodKeys(dashboard);
    const [open, setOpen] = useState(false);
    return (
        <Sheet onOpenChange={setOpen} open={open}>
            {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the trigger fills this button with its children. */}
            <Sheet.Trigger render={<button className={CHIP} type="button" />}>
                {titled(fmt.spanName(filters.period), locale)}
                <Chevron />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell ph-no-capture max-h-[60dvh]">
                <Sheet.Header title={copy.period} />
                <Sheet.Body className="px-2">
                    {keys.map((key) => {
                        const on = key === filters.period.key;
                        return (
                            <button
                                aria-pressed={on}
                                className={`${ROW} text-left`}
                                key={key}
                                onClick={() => {
                                    setFilters({ period: key === filters.currentKey ? null : key });
                                    setOpen(false);
                                }}
                                type="button"
                            >
                                <span className={on ? "font-medium" : ""}>
                                    {titled(fmt.spanName(periodOf(key, ledger.firstDayOfMonth)), locale)}
                                </span>
                                <HugeiconsIcon
                                    className={`ml-auto ${on ? "text-app-tint" : "invisible"}`}
                                    icon={Tick02Icon}
                                    size={18}
                                    strokeWidth={2}
                                />
                            </button>
                        );
                    })}
                </Sheet.Body>
            </Sheet.Content>
        </Sheet>
    );
}

export function AccountsChip({ quiet }: { quiet: boolean }) {
    const { filters, ledger, photos, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const { money } = useDisplayFormat();
    const accounts = useMemo(() => openAccounts(ledger.books), [ledger.books]);
    const balances = useMemo(
        () =>
            new Map(accountBalances(ledger, filters.period, quiet, []).accounts.map((each) => [each.id, each.balance])),
        [filters.period, ledger, quiet]
    );
    if (accounts.length < 2) {
        return null;
    }
    const chosen = accounts.filter((account) => filters.accounts.includes(account.localId));
    const [only] = chosen;
    const named = chosen.length === 1 && only ? only.name : `${chosen.length} ${copy.accounts.value}`;
    return (
        <Sheet>
            {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the trigger fills this button with its children. */}
            <Sheet.Trigger render={<button className={CHIP} type="button" />}>
                {chosen.length === 0 ? copy.allAccounts : named}
                <Chevron />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell ph-no-capture">
                <Sheet.Header title={copy.accountsChip} />
                <Sheet.Body className="px-2">
                    {accounts.map((account) => (
                        <label className={ROW} key={account.localId}>
                            <Checkbox
                                checked={filters.accounts.includes(account.localId)}
                                onCheckedChange={() =>
                                    setFilters({ accounts: toggledAccounts(filters.accounts, account.localId) })
                                }
                            />
                            <AccountTile account={accountLook(account)} photos={photos} size="sm" />
                            <span className="min-w-0 truncate">{account.name}</span>
                            <span
                                className={`${FIGURE} text-muted-foreground ml-auto pl-2 text-[13px] whitespace-nowrap`}
                            >
                                {money(balances.get(account.localId) ?? 0, ledger.currency)}
                            </span>
                        </label>
                    ))}
                </Sheet.Body>
                <Sheet.Footer>
                    <Sheet.Close render={<Button size="lg" />}>{copy.done}</Sheet.Close>
                    <Button onClick={() => setFilters({ accounts: [] })} size="lg" variant="ghost">
                        {copy.clear}
                    </Button>
                </Sheet.Footer>
            </Sheet.Content>
        </Sheet>
    );
}
