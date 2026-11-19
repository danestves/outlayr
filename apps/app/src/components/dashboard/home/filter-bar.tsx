import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Chip } from "panelui-web/chip";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { toggledAccounts } from "@/components/dashboard/shell/filters";
import { CHIP, TopBar } from "@/components/dashboard/shell/top-bar";
import { AccountTile } from "@/components/ledger/tiles";
import { MenuContent } from "@/components/ui/menu-content";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCategoryName } from "./format";
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
const SHEET_LABEL = "text-muted-foreground text-app-caption px-2 pt-1.5 pb-0.5";

const SHEET_ROW = "hover:bg-app-hover rounded-app-sm text-app-body flex h-11 w-full shrink-0 items-center gap-2 px-2";
const FIGURE = "dash-figure text-muted-foreground text-app-label min-w-0 flex-1 pl-2 text-right whitespace-nowrap";
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
    icon: IconSvgElement;
    label: ReactNode;
    onClear: () => void;
    searchLabel: string;
    width: string;
}

export function FilterMenu({ children, count, icon, label, onClear, searchLabel, width }: FilterMenuProps) {
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
            <HugeiconsIcon icon={count > 0 ? icon : Add01Icon} strokeWidth={1.5} />
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
                <MenuContent className={width} sideOffset={8}>
                    {search(true)}
                    {children(matches)}
                    <Menu.Separator />
                    <Menu.Item closeOnClick={false} onClick={onClear}>
                        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                        {copy.clear}
                        <span className="dash-figure text-muted-foreground text-app-caption ml-auto">
                            {copy.selected({ count })}
                        </span>
                    </Menu.Item>
                </MenuContent>
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
                                <span className="dash-figure text-muted-foreground text-app-caption">{count}</span>
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
    const { filters, ledger, setFilters } = useDashboard();
    const { money } = useDisplayFormat();
    const balances = useMemo(
        () =>
            new Map(accountBalances(ledger, filters.range, quiet, []).accounts.map((each) => [each.id, each.balance])),
        [filters.range, ledger, quiet]
    );
    return (
        <div className="dash-menu-list flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {accounts
                .filter((account) => matches(account.name))
                .map((account) => (
                    <CheckRow
                        figure={money(balances.get(account.localId) ?? 0, ledger.currency)}
                        key={account.localId}
                        on={filters.accounts.includes(account.localId)}
                        onToggle={() => setFilters({ accounts: toggledAccounts(filters.accounts, account.localId) })}
                    >
                        <AccountTile account={accountLook(account)} size="sm" />
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
            icon={CreditCardIcon}
            label={copy.accountsChip}
            onClear={() => setFilters({ accounts: [] })}
            searchLabel={copy.searchAccounts.value}
            width="w-80"
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
        () => categoryChoices(ledger, filters.range, { accounts: filters.accounts }, filters.categories),
        [filters.accounts, filters.categories, filters.range, ledger]
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
            icon={Tag01Icon}
            label={copy.categoryChip}
            onClear={() => setFilters({ categories: [] })}
            searchLabel={copy.searchCategories.value}
            width="w-75"
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

export function FilterBar({
    categories = true,
    quiet,
    setup,
}: {
    categories?: boolean;
    quiet: boolean;
    setup: SetupState | null;
}) {
    return (
        <TopBar>
            {setup ? null : (
                <>
                    <AccountMenu quiet={quiet} />
                    {categories ? <CategoryMenu /> : null}
                </>
            )}
        </TopBar>
    );
}
