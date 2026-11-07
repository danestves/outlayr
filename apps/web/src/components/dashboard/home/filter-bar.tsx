import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { RiAddLine, RiBankCardLine, RiCheckLine, RiCloseLine, RiPriceTag3Line, RiSearch2Line } from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { usePeriodKeys } from "@/components/dashboard/shell/top-bar";
import { AccountTile } from "@/components/ledger/tiles";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName, usePeriodTitle } from "./format";
import { accountBalances, categoryChoices } from "./model";
import type { SetupState } from "./model";

type LiveAccount = Dashboard["ledger"]["books"]["accounts"][number];

interface CheckRowProps {
    children: ReactNode;
    className?: string;
    figure: string;
    on: boolean;
    onToggle: () => void;
}

function CheckRow({ children, className = "", figure, on, onToggle }: CheckRowProps) {
    return (
        <Menu.Item
            aria-checked={on}
            className={`dash-menu-item shrink-0 ${className}`}
            closeOnClick={false}
            onClick={onToggle}
            role="menuitemcheckbox"
        >
            <span className="dash-check" data-on={on}>
                {on ? <RiCheckLine className="absolute -inset-px" size={16} /> : null}
            </span>
            {children}
            <span className="dash-figure text-muted-foreground ml-auto shrink-0 pl-2 text-[13px] whitespace-nowrap">
                {figure}
            </span>
        </Menu.Item>
    );
}

interface FilterMenuProps {
    children: (matches: (name: string) => boolean) => ReactNode;
    count: number;
    icon: RemixiconComponentType;
    label: ReactNode;
    onClear: () => void;
    searchLabel: string;
    width: string;
}

function FilterMenu({ children, count, icon: Icon, label, onClear, searchLabel, width }: FilterMenuProps) {
    const { filters: copy } = useIntlayer("dashboard");
    const [query, setQuery] = useState("");
    const needle = query.trim().toLocaleLowerCase();
    return (
        <Menu
            onOpenChange={(open) => {
                if (!open) {
                    setQuery("");
                }
            }}
        >
            <Menu.Trigger className="dash-chip" data-on={count > 0}>
                {count > 0 ? <Icon size={14} /> : <RiAddLine className="-ml-0.5" size={14} />}
                {label}
                {count > 0 ? (
                    <span className="dash-count bg-[color-mix(in_oklab,var(--color-app-tint)_30%,var(--color-app-bg))]">
                        {count}
                    </span>
                ) : null}
            </Menu.Trigger>
            <Menu.Content className={`app-shell dash-menu ph-no-capture gap-0.5 p-2 ${width}`} sideOffset={8}>
                <label className="border-app-tint text-muted-foreground mb-1.5 flex h-9 shrink-0 items-center gap-2 rounded-[10px] border px-2.5 text-[13px] shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-app-tint)_22%,transparent)]">
                    <RiSearch2Line size={15} />
                    <input
                        aria-label={searchLabel}
                        className="text-foreground placeholder:text-muted-foreground w-full bg-transparent outline-none"
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            // Typing stays in the field; the menu's typeahead would otherwise take each letter.
                            if (event.key !== "Escape" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                                event.stopPropagation();
                            }
                        }}
                        placeholder={searchLabel}
                        ref={(input) => {
                            input?.focus();
                        }}
                        value={query}
                    />
                </label>
                {children((name) => name.toLocaleLowerCase().includes(needle))}
                <div className="dash-menu-rule my-1" />
                <Menu.Item className="dash-menu-item text-muted-foreground" closeOnClick={false} onClick={onClear}>
                    <RiCloseLine size={16} />
                    {copy.clear}
                    <span className="dash-figure ml-auto text-xs">{copy.selected({ count })}</span>
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

function AccountRows({
    accounts,
    matches,
    quiet,
}: {
    accounts: readonly LiveAccount[];
    matches: (name: string) => boolean;
    quiet: boolean;
}) {
    const { filters, ledger, photos, setFilters } = useDashboard();
    const { money } = useDisplayFormat();
    const balances = useMemo(
        () =>
            new Map(accountBalances(ledger, filters.period, quiet, []).accounts.map((each) => [each.id, each.balance])),
        [filters.period, ledger, quiet]
    );
    return (
        <div className="dash-menu-list flex max-h-[323px] flex-col gap-0.5 overflow-y-auto">
            {accounts
                .filter((account) => matches(account.name))
                .map((account) => (
                    <CheckRow
                        className="h-[34px]!"
                        figure={money(balances.get(account.localId) ?? 0, ledger.currency)}
                        key={account.localId}
                        on={filters.accounts.includes(account.localId)}
                        onToggle={() => setFilters({ accounts: toggledAccounts(filters.accounts, account.localId) })}
                    >
                        <AccountTile account={accountLook(account)} photos={photos} size="sm" />
                        <span className="min-w-0 truncate">{account.name}</span>
                    </CheckRow>
                ))}
        </div>
    );
}

function AccountMenu({ quiet }: { quiet: boolean }) {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const accounts = useMemo(
        () =>
            ledger.books.accounts.filter((row) => row.deletedAt === null).toSorted((a, b) => a.sortOrder - b.sortOrder),
        [ledger.books.accounts]
    );
    if (accounts.length < 2) {
        return null;
    }
    return (
        <FilterMenu
            count={filters.accounts.length}
            icon={RiBankCardLine}
            label={copy.accountsChip}
            onClear={() => setFilters({ accounts: [] })}
            searchLabel={copy.searchAccounts.value}
            width="w-[320px]"
        >
            {(matches) => <AccountRows accounts={accounts} matches={matches} quiet={quiet} />}
        </FilterMenu>
    );
}

function CategoryMenu() {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const choices = useMemo(
        () => categoryChoices(ledger, filters.period, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.period, ledger]
    );
    const row = (each: (typeof choices.all)[number]) => {
        const on = filters.categories.includes(each.id);
        return (
            <CheckRow
                figure={money(each.total, ledger.currency)}
                key={each.id}
                on={on}
                onToggle={() =>
                    setFilters({
                        categories: on
                            ? filters.categories.filter((id) => id !== each.id)
                            : [...filters.categories, each.id],
                    })
                }
            >
                <u aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: each.color }} />
                <span className="truncate">{categoryName(each)}</span>
            </CheckRow>
        );
    };
    return (
        <FilterMenu
            count={filters.categories.length}
            icon={RiPriceTag3Line}
            label={copy.categoryChip}
            onClear={() => setFilters({ categories: [] })}
            searchLabel={copy.searchCategories.value}
            width="w-[300px]"
        >
            {(matches) => {
                const recent = choices.recent.filter((each) => matches(categoryName(each)));
                const all = choices.all.filter((each) => matches(categoryName(each)));
                return (
                    <>
                        {recent.length > 0 ? (
                            <>
                                <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4">
                                    {copy.recent}
                                </div>
                                {recent.map(row)}
                                <div className="dash-menu-rule my-1" />
                            </>
                        ) : null}
                        <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4">
                            {copy.allCategories}
                        </div>
                        <div className="dash-menu-list flex max-h-72 flex-col gap-0.5 overflow-y-auto">
                            {all.map(row)}
                        </div>
                    </>
                );
            }}
        </FilterMenu>
    );
}

function PeriodControl() {
    const dashboard = useDashboard();
    const { filters, ledger, setFilters } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const keys = usePeriodKeys(dashboard);
    return (
        <div className="bg-app-group inline-flex rounded-[10px] p-[3px] sm:ml-auto">
            <Menu>
                <Menu.Trigger className="dash-seg" data-on>
                    {title(filters.period)}
                </Menu.Trigger>
                <Menu.Content className="app-shell dash-menu ph-no-capture max-h-80 overflow-y-auto" sideOffset={8}>
                    {keys.map((key) => (
                        <Menu.Item
                            className="dash-menu-item"
                            key={key}
                            onClick={() => setFilters({ period: key === filters.currentKey ? null : key })}
                        >
                            {title(periodOf(key, ledger.firstDayOfMonth))}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu>
            <span aria-disabled className="dash-seg">
                {copy.quarter}
            </span>
            <span aria-disabled className="dash-seg">
                {copy.year}
            </span>
        </div>
    );
}

export function FilterBar({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { add } = useIntlayer("dashboard");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5">
            {setup ? null : (
                <>
                    <AccountMenu quiet={quiet} />
                    <CategoryMenu />
                </>
            )}
            <PeriodControl />
            <button aria-disabled className="dash-btn sm:ml-1" title={add.hint.value} type="button">
                <RiAddLine size={18} />
                {add.entry}
            </button>
        </div>
    );
}
