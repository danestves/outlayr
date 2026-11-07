import { RiAddLine, RiCheckLine, RiCloseLine, RiPriceTag3Line, RiSearch2Line } from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { usePeriodKeys } from "@/components/dashboard/shell/top-bar";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName, usePeriodTitle } from "./format";
import { categoryChoices } from "./model";

function AccountChips() {
    const { filters, ledger, setFilters } = useDashboard();
    const accounts = useMemo(
        () =>
            ledger.books.accounts.filter((row) => row.deletedAt === null).toSorted((a, b) => a.sortOrder - b.sortOrder),
        [ledger.books.accounts]
    );
    const every = accounts.map((account) => account.localId);
    return accounts.map((account) => {
        const on = filters.accounts.length === 0 || filters.accounts.includes(account.localId);
        return (
            <button
                aria-pressed={on}
                className="dash-chip"
                data-on={on}
                key={account.localId}
                onClick={() => setFilters({ accounts: toggledAccounts(every, filters.accounts, account.localId) })}
                type="button"
            >
                {on ? <RiCheckLine className="-ml-0.5" size={14} /> : <RiAddLine className="-ml-0.5" size={14} />}
                {account.name}
            </button>
        );
    });
}

function CategoryMenu() {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const [query, setQuery] = useState("");
    const choices = useMemo(
        () => categoryChoices(ledger, filters.period, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.period, ledger]
    );
    const count = filters.categories.length;
    const matches = (each: { id: string; name: string }) =>
        categoryName(each).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const row = (each: (typeof choices.all)[number]) => {
        const on = filters.categories.includes(each.id);
        return (
            <Menu.Item
                aria-checked={on}
                className="dash-menu-item"
                closeOnClick={false}
                key={each.id}
                onClick={() =>
                    setFilters({
                        categories: on
                            ? filters.categories.filter((id) => id !== each.id)
                            : [...filters.categories, each.id],
                    })
                }
                role="menuitemcheckbox"
            >
                <span className="dash-check" data-on={on}>
                    {on ? <RiCheckLine className="absolute -inset-px" size={16} /> : null}
                </span>
                <u aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: each.color }} />
                <span className="truncate">{categoryName(each)}</span>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {money(each.total, ledger.currency)}
                </span>
            </Menu.Item>
        );
    };
    const recent = choices.recent.filter(matches);
    const all = choices.all.filter(matches);
    return (
        <Menu>
            <Menu.Trigger className="dash-chip ml-2 gap-[7px]" data-on={count > 0}>
                {count > 0 ? (
                    <RiPriceTag3Line className="-ml-0.5" size={14} />
                ) : (
                    <RiAddLine className="-ml-0.5" size={14} />
                )}
                {copy.categoryChip}
                {count > 0 ? (
                    <span className="dash-count bg-[color-mix(in_oklab,var(--color-app-tint)_30%,var(--color-app-bg))]">
                        {count}
                    </span>
                ) : null}
            </Menu.Trigger>
            <Menu.Content className="app-shell dash-menu ph-no-capture w-[300px] gap-0.5 p-2" sideOffset={8}>
                <label className="border-app-tint text-muted-foreground mb-1.5 flex h-9 items-center gap-2 rounded-[10px] border px-2.5 text-[13px] shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-app-tint)_22%,transparent)]">
                    <RiSearch2Line size={15} />
                    <input
                        aria-label={copy.searchCategories.value}
                        className="text-foreground placeholder:text-muted-foreground w-full bg-transparent outline-none"
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            // Typing stays in the field; the menu's typeahead would otherwise take each letter.
                            if (event.key !== "Escape" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                                event.stopPropagation();
                            }
                        }}
                        placeholder={copy.searchCategories.value}
                        ref={(input) => {
                            input?.focus();
                        }}
                        value={query}
                    />
                </label>
                {recent.length > 0 ? (
                    <>
                        <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4">{copy.recent}</div>
                        {recent.map(row)}
                        <div className="dash-menu-rule my-1" />
                    </>
                ) : null}
                <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4">{copy.allCategories}</div>
                <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">{all.map(row)}</div>
                <div className="dash-menu-rule my-1" />
                <Menu.Item
                    className="dash-menu-item text-muted-foreground"
                    closeOnClick={false}
                    onClick={() => setFilters({ categories: [] })}
                >
                    <RiCloseLine size={16} />
                    {copy.clear}
                    <span className="dash-figure ml-auto text-xs">{copy.selected({ count })}</span>
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

function PeriodControl() {
    const dashboard = useDashboard();
    const { filters, ledger, setFilters } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const keys = usePeriodKeys(dashboard);
    return (
        <div className="bg-app-group ml-auto inline-flex rounded-[10px] p-[3px]">
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

export function FilterBar() {
    const { add } = useIntlayer("dashboard");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 lg:py-0">
            <AccountChips />
            <CategoryMenu />
            <PeriodControl />
            <button aria-disabled className="dash-btn ml-1" title={add.hint.value} type="button">
                <RiAddLine size={18} />
                {add.entry}
            </button>
        </div>
    );
}
