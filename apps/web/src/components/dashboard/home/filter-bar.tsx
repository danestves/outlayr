import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Chip } from "panelui-web/chip";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { Tabs } from "panelui-web/tabs";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { usePeriodKeys } from "@/components/dashboard/shell/period-keys";
import { AccountTile } from "@/components/ledger/tiles";
import { openAccounts, rowsBetween, total } from "@/lib/dashboard-series-ledger";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName, usePeriodTitle } from "./format";
import { accountBalances, categoryChoices } from "./model";
import type { SetupState } from "./model";

type LiveAccount = Dashboard["ledger"]["books"]["accounts"][number];

interface CheckRowProps {
    children: ReactNode;
    figure: string;
    on: boolean;
    onToggle: () => void;
}

const InSheet = createContext(false);
const SHEET_LABEL = "text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4";

const SHEET_ROW = "hover:bg-app-hover flex h-11 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-sm";
const FIGURE = "dash-figure text-muted-foreground min-w-0 flex-1 pl-2 text-right text-[13px] whitespace-nowrap";
const CHIP = "relative gap-1.5 text-[13px] max-lg:after:absolute max-lg:after:-inset-x-0.5 max-lg:after:-inset-y-1.5";

function CheckRow({ children, figure, on, onToggle }: CheckRowProps) {
    const inSheet = useContext(InSheet);
    if (inSheet) {
        return (
            <label className={SHEET_ROW}>
                <Checkbox checked={on} onCheckedChange={onToggle} />
                {children}
                <span className={FIGURE}>{figure}</span>
            </label>
        );
    }
    return (
        <Menu.CheckboxItem checked={on} className="shrink-0" onCheckedChange={onToggle}>
            {children}
            <span className={FIGURE}>{figure}</span>
        </Menu.CheckboxItem>
    );
}

interface FilterMenuProps {
    children: (matches: (name: string) => boolean) => ReactNode;
    count: number;
    label: ReactNode;
    onClear: () => void;
    searchLabel: string;
    width: string;
}

export function FilterMenu({ children, count, label, onClear, searchLabel, width }: FilterMenuProps) {
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
            {count > 0 ? null : <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />}
            {label}
            {count > 0 ? (
                <Badge className="dash-figure ml-1.5" size="sm" variant="secondary">
                    {count}
                </Badge>
            ) : null}
        </>
    );
    const search = (focus: boolean) => (
        <Input.Group className="mb-1.5 shrink-0">
            <Input.Addon>
                <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={2} />
            </Input.Addon>
            <Input
                aria-label={searchLabel}
                className="pointer-coarse:text-base"
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
        </Input.Group>
    );
    return (
        <>
            <Menu onOpenChange={forget}>
                <Menu.Trigger
                    render={
                        <Chip
                            className={`${CHIP} max-lg:hidden`}
                            data-pressed={count > 0 ? "" : undefined}
                            pressed={count > 0}
                            size="lg"
                        />
                    }
                >
                    {chip}
                </Menu.Trigger>
                <Menu.Content className={`app-shell ph-no-capture ${width}`} sideOffset={8}>
                    {search(true)}
                    {children(matches)}
                    <Menu.Separator />
                    <Menu.Item closeOnClick={false} onClick={onClear}>
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                        {copy.clear}
                        <span className="dash-figure text-muted-foreground ml-auto text-xs">
                            {copy.selected({ count })}
                        </span>
                    </Menu.Item>
                </Menu.Content>
            </Menu>
            <Sheet onOpenChange={forget}>
                <Sheet.Trigger render={<Chip className={`${CHIP} lg:hidden`} pressed={count > 0} size="lg" />}>
                    {chip}
                </Sheet.Trigger>
                <Sheet.Content className="app-shell ph-no-capture">
                    <Sheet.Header title={label} />
                    <div className="px-4">{search(false)}</div>
                    <Sheet.Body className="px-2 [&_.dash-menu-list]:max-h-none [&_.dash-menu-list]:overflow-visible">
                        <InSheet value>{children(matches)}</InSheet>
                    </Sheet.Body>
                    <Sheet.Footer>
                        <Sheet.Close render={<Button size="lg" />}>{copy.done}</Sheet.Close>
                        <Button onClick={onClear} size="lg" variant="ghost">
                            {copy.clear}
                            {count > 0 ? (
                                <span className="dash-figure text-muted-foreground text-xs">{count}</span>
                            ) : null}
                        </Button>
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

export function AccountMenu({ quiet }: { quiet: boolean }) {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const accounts = useMemo(() => openAccounts(ledger.books), [ledger.books]);
    if (accounts.length < 2) {
        return null;
    }
    return (
        <FilterMenu
            count={filters.accounts.length}
            label={copy.accountsChip}
            onClear={() => setFilters({ accounts: [] })}
            searchLabel={copy.searchAccounts.value}
            width="w-[320px]"
        >
            {(matches) => <AccountRows accounts={accounts} matches={matches} quiet={quiet} />}
        </FilterMenu>
    );
}

function CategoryRows({
    all,
    allLabel,
    recent,
    recentLabel,
}: {
    all: ReactNode[];
    allLabel: ReactNode;
    recent: ReactNode[];
    recentLabel: ReactNode;
}) {
    const inSheet = useContext(InSheet);
    const list = <div className="dash-menu-list flex max-h-72 flex-col gap-0.5 overflow-y-auto">{all}</div>;
    if (inSheet) {
        return (
            <>
                {recent.length > 0 ? (
                    <>
                        <div className={SHEET_LABEL}>{recentLabel}</div>
                        {recent}
                    </>
                ) : null}
                <div className={SHEET_LABEL}>{allLabel}</div>
                {list}
            </>
        );
    }
    return (
        <>
            {recent.length > 0 ? (
                <>
                    <Menu.Group>
                        <Menu.GroupLabel>{recentLabel}</Menu.GroupLabel>
                        {recent}
                    </Menu.Group>
                    <Menu.Separator />
                </>
            ) : null}
            <Menu.Group>
                <Menu.GroupLabel>{allLabel}</Menu.GroupLabel>
                {list}
            </Menu.Group>
        </>
    );
}

export function CategoryMenu() {
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
            label={copy.categoryChip}
            onClear={() => setFilters({ categories: [] })}
            searchLabel={copy.searchCategories.value}
            width="w-[300px]"
        >
            {(matches) => {
                const recent = choices.recent.filter((each) => matches(categoryName(each)));
                const all = choices.all.filter((each) => matches(categoryName(each)));
                return (
                    <CategoryRows
                        all={all.map(row)}
                        recent={recent.map(row)}
                        recentLabel={copy.recent}
                        allLabel={copy.allCategories}
                    />
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
        <Tabs className="ml-auto max-lg:hidden" value="month">
            <Tabs.List className="p-0.5">
                <Menu>
                    <Menu.Trigger render={<Tabs.Trigger value="month" />}>{title(filters.period)}</Menu.Trigger>
                    <Menu.Content className="app-shell ph-no-capture max-h-80 overflow-y-auto" sideOffset={8}>
                        <Menu.RadioGroup
                            onValueChange={(key: string) =>
                                setFilters({ period: key === filters.currentKey ? null : key })
                            }
                            value={filters.period.key}
                        >
                            {keys.map((key) => (
                                <Menu.RadioItem closeOnClick key={key} value={key}>
                                    {title(periodOf(key, ledger.firstDayOfMonth))}
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </Menu.Content>
                </Menu>
                <Tabs.Trigger disabled value="quarter">
                    {copy.quarter}
                </Tabs.Trigger>
                <Tabs.Trigger disabled value="year">
                    {copy.year}
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs>
    );
}

function PeriodRows({ onPick }: { onPick: (key: string) => void }) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { money } = useDisplayFormat();
    const title = usePeriodTitle(ledger.firstDayOfMonth, "");
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
                className={`${SHEET_ROW} text-left`}
                key={period.key}
                onClick={() => onPick(period.key)}
                type="button"
            >
                <span className={on ? "font-medium" : ""}>{title(period)}</span>
                <span className="dash-figure text-muted-foreground ml-auto text-[13px]">
                    {money(spent, ledger.currency)}
                </span>
                <HugeiconsIcon
                    className={on ? "text-app-tint" : "invisible"}
                    icon={Tick02Icon}
                    size={18}
                    strokeWidth={2}
                />
            </button>
        );
    });
}

function PeriodSheet() {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const { spent } = useIntlayer("dashboard-home").kpi;
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const [open, setOpen] = useState(false);
    return (
        <Sheet onOpenChange={setOpen} open={open}>
            <Sheet.Trigger render={<Chip className={`${CHIP} lg:hidden`} pressed={false} size="lg" />}>
                <HugeiconsIcon className="text-muted-foreground" icon={Calendar03Icon} strokeWidth={2} />
                {title(filters.period)}
                <HugeiconsIcon className="text-muted-foreground" icon={ArrowDown01Icon} strokeWidth={2} />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell ph-no-capture max-h-[60dvh]">
                <Sheet.Header title={copy.period} />
                <Tabs className="mx-4 mb-2" value="month">
                    <Tabs.List className="w-full">
                        <Tabs.Trigger className="flex-1" value="month">
                            {copy.month}
                        </Tabs.Trigger>
                        <Tabs.Trigger className="flex-1" disabled value="quarter">
                            {copy.quarter}
                        </Tabs.Trigger>
                        <Tabs.Trigger className="flex-1" disabled value="year">
                            {copy.year}
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs>
                <div className="text-muted-foreground flex justify-between px-4 pr-[42px] pb-1 text-xs leading-4">
                    <span>{copy.month}</span>
                    <span>{spent}</span>
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

export function FilterBar({
    categories = true,
    quiet,
    setup,
}: {
    categories?: boolean;
    quiet: boolean;
    setup: SetupState | null;
}) {
    const { add } = useIntlayer("dashboard");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 max-lg:-mx-4 max-lg:[scrollbar-width:none] max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] max-lg:px-4 max-sm:min-h-0 max-sm:py-3">
            <PeriodSheet />
            {setup ? null : (
                <>
                    <AccountMenu quiet={quiet} />
                    {categories ? <CategoryMenu /> : null}
                </>
            )}
            <PeriodControl />
            <Button aria-disabled className="ml-1 max-lg:hidden" title={add.hint.value}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                {add.entry}
            </Button>
        </div>
    );
}
