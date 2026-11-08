import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import {
    RiAddLine,
    RiArrowDownSLine,
    RiBankCardLine,
    RiCalendarLine,
    RiCheckLine,
    RiCloseLine,
    RiPriceTag3Line,
    RiSearch2Line,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { usePeriodKeys } from "@/components/dashboard/shell/top-bar";
import { AccountTile } from "@/components/ledger/tiles";
import { rowsBetween, total } from "@/lib/dashboard-series-ledger";
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

const InSheet = createContext(false);

function CheckRow({ children, className = "", figure, on, onToggle }: CheckRowProps) {
    const inSheet = useContext(InSheet);
    const inner = (
        <>
            <span className="dash-check" data-on={on}>
                {on ? <RiCheckLine className="absolute -inset-px" size={16} /> : null}
            </span>
            {children}
            <span className="dash-figure text-muted-foreground ml-auto shrink-0 pl-2 text-[13px] whitespace-nowrap">
                {figure}
            </span>
        </>
    );
    if (inSheet) {
        return (
            <label className="dash-menu-item has-focus-visible:ring-app-tint h-11! w-full shrink-0 has-focus-visible:ring-2">
                <input checked={on} className="sr-only" onChange={onToggle} type="checkbox" />
                {inner}
            </label>
        );
    }
    return (
        <Menu.Item
            aria-checked={on}
            className={`dash-menu-item shrink-0 ${className}`}
            closeOnClick={false}
            onClick={onToggle}
            role="menuitemcheckbox"
        >
            {inner}
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
    const matches = (name: string) => name.toLocaleLowerCase().includes(needle);
    const forget = (open: boolean) => {
        if (!open) {
            setQuery("");
        }
    };
    const chip = (
        <>
            {count > 0 ? <Icon size={14} /> : <RiAddLine className="-ml-0.5" size={14} />}
            {label}
            {count > 0 ? (
                <span className="dash-count bg-[color-mix(in_oklab,var(--color-app-tint)_30%,var(--color-app-bg))]">
                    {count}
                </span>
            ) : null}
        </>
    );
    const search = (focus: boolean) => (
        <label className="border-border focus-within:border-app-tint text-muted-foreground mb-1.5 flex h-9 shrink-0 items-center gap-2 rounded-[10px] border px-2.5 text-[13px] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-app-tint)_22%,transparent)]">
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
                    if (focus) {
                        input?.focus();
                    }
                }}
                value={query}
            />
        </label>
    );
    return (
        <>
            <Menu onOpenChange={forget}>
                <Menu.Trigger className="dash-chip max-lg:hidden" data-on={count > 0}>
                    {chip}
                </Menu.Trigger>
                <Menu.Content className={`app-shell dash-menu ph-no-capture gap-0.5 p-2 ${width}`} sideOffset={8}>
                    {search(true)}
                    {children(matches)}
                    <div className="dash-menu-rule my-1" />
                    <Menu.Item className="dash-menu-item text-muted-foreground" closeOnClick={false} onClick={onClear}>
                        <RiCloseLine size={16} />
                        {copy.clear}
                        <span className="dash-figure ml-auto text-xs">{copy.selected({ count })}</span>
                    </Menu.Item>
                </Menu.Content>
            </Menu>
            <Sheet onOpenChange={forget}>
                <Sheet.Trigger className="dash-chip lg:hidden" data-on={count > 0}>
                    {chip}
                </Sheet.Trigger>
                <Sheet.Content className="app-shell dash-sheet ph-no-capture" detached={false}>
                    <Sheet.Header title={label} />
                    <div className="px-4">{search(false)}</div>
                    <Sheet.Body className="px-2 [&_.dash-menu-list]:max-h-none [&_.dash-menu-list]:overflow-visible">
                        <InSheet value>{children(matches)}</InSheet>
                    </Sheet.Body>
                    <Sheet.Footer className="flex-row">
                        <button className="dash-ob h-11 flex-1 justify-center text-sm" onClick={onClear} type="button">
                            {copy.clear}
                            {count > 0 ? (
                                <span className="dash-figure text-muted-foreground text-xs">{count}</span>
                            ) : null}
                        </button>
                        <Sheet.Close className="dash-btn h-11 flex-1 justify-center">{copy.done}</Sheet.Close>
                    </Sheet.Footer>
                </Sheet.Content>
            </Sheet>
        </>
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
        <div className="bg-app-group ml-auto inline-flex rounded-[10px] p-[3px] max-lg:hidden">
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

function PeriodRows({ onPick }: { onPick: (key: string) => void }) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { money } = useDisplayFormat();
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const keys = usePeriodKeys(dashboard);
    const periods = useMemo(
        () =>
            keys.map((key) => {
                const period = periodOf(key, ledger.firstDayOfMonth);
                const spent = total(ledger, rowsBetween(ledger, filters, period.from, period.to, false));
                return { period, spent };
            }),
        [filters, keys, ledger]
    );
    return periods.map(({ period, spent }) => {
        const on = period.key === filters.period.key;
        return (
            <button
                aria-pressed={on}
                className="dash-menu-item h-11! w-full text-left"
                key={period.key}
                onClick={() => onPick(period.key)}
                type="button"
            >
                <span className={on ? "font-medium" : ""}>{title(period)}</span>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {money(spent, ledger.currency)}
                </span>
                <RiCheckLine className={`text-app-tint shrink-0 ${on ? "" : "invisible"}`} size={18} />
            </button>
        );
    });
}

function PeriodSheet() {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const [open, setOpen] = useState(false);
    return (
        <Sheet onOpenChange={setOpen} open={open}>
            <Sheet.Trigger className="dash-chip lg:hidden">
                <RiCalendarLine className="text-muted-foreground" size={14} />
                {title(filters.period)}
                <RiArrowDownSLine className="text-muted-foreground" size={15} />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell dash-sheet ph-no-capture" detached={false}>
                <Sheet.Header title={copy.period} />
                <div className="bg-app-fill mx-4 mb-2 flex rounded-[10px] p-[3px]">
                    <span className="dash-seg bg-app-group text-foreground h-9 flex-1 justify-center">
                        {copy.month}
                    </span>
                    <span aria-disabled className="dash-seg h-9 flex-1 justify-center opacity-60">
                        {copy.quarter}
                    </span>
                    <span aria-disabled className="dash-seg h-9 flex-1 justify-center opacity-60">
                        {copy.year}
                    </span>
                </div>
                <Sheet.Body className="px-2">
                    <PeriodRows
                        onPick={(key) => {
                            setFilters({ period: key === filters.currentKey ? null : key });
                            setOpen(false);
                        }}
                    />
                </Sheet.Body>
            </Sheet.Content>
        </Sheet>
    );
}

export function FilterBar({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { add } = useIntlayer("dashboard");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 max-lg:-mx-4 max-lg:[scrollbar-width:none] max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] max-lg:px-4 max-sm:min-h-0 max-sm:py-3">
            <PeriodSheet />
            {setup ? null : (
                <>
                    <AccountMenu quiet={quiet} />
                    <CategoryMenu />
                </>
            )}
            <PeriodControl />
            <button aria-disabled className="dash-btn ml-1 max-lg:hidden" title={add.hint.value} type="button">
                <RiAddLine size={18} />
                {add.entry}
            </button>
        </div>
    );
}
