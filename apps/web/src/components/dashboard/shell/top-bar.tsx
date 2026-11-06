import Add from "@hugeicons/core-free-icons/Add01Icon";
import Caret from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Menu } from "panelui-web/menu";
import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { periodKeyOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { shortDay } from "@/lib/ledger";

import { DashboardContext } from "./dashboard";
import type { Dashboard } from "./dashboard";

const MONTHS_LISTED = 24;

const monthsBetween = (from: string, to: string) => {
    const [fromYear = 0, fromMonth = 0] = from.split("-").map(Number);
    const [toYear = 0, toMonth = 0] = to.split("-").map(Number);
    return (toYear - fromYear) * 12 + toMonth - fromMonth;
};

function usePeriodLabel(firstDayOfMonth: number) {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return (period: Period) =>
        firstDayOfMonth === 1
            ? new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" }).format(
                  Date.parse(`${period.from}T12:00:00Z`)
              )
            : `${shortDay(period.from)} - ${shortDay(period.to)}`;
}

const CHIP_BUTTON = "h-8 max-w-64 min-w-0 gap-1.5 px-2.5 text-sm font-medium";

function PeriodChip({ filters, ledger, setFilters }: Dashboard) {
    const label = usePeriodLabel(ledger.firstDayOfMonth);
    const keys = useMemo(() => {
        const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
        const count = Math.min(
            monthsBetween(periodKeyOf(earliest, ledger.firstDayOfMonth), filters.currentKey) + 1,
            MONTHS_LISTED
        );
        return Array.from({ length: count }, (_, index) => shiftPeriodKey(filters.currentKey, -index));
    }, [filters.currentKey, ledger.firstDayOfMonth, ledger.rows, ledger.today]);
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP_BUTTON} size="sm" variant="outline" />}>
                {label(filters.period)}
                <HugeiconsIcon className="size-3.5" icon={Caret} />
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture max-h-80 overflow-y-auto">
                <Menu.RadioGroup
                    onValueChange={(key) => setFilters({ period: key === filters.currentKey ? null : key })}
                    value={filters.period.key}
                >
                    {keys.map((key) => (
                        <Menu.RadioItem closeOnClick key={key} value={key}>
                            {label(periodOf(key, ledger.firstDayOfMonth))}
                        </Menu.RadioItem>
                    ))}
                </Menu.RadioGroup>
            </Menu.Content>
        </Menu>
    );
}

function AccountsChip({ filters, ledger, setFilters }: Dashboard) {
    const { filters: copy } = useIntlayer("dashboard");
    const accounts = useMemo(
        () =>
            ledger.books.accounts.filter((row) => row.deletedAt === null).toSorted((a, b) => a.sortOrder - b.sortOrder),
        [ledger.books.accounts]
    );
    const chosen = new Set(filters.accounts);
    const only = chosen.size === 1 ? ledger.accounts.get([...chosen][0] ?? "")?.name : undefined;
    const toggle = (id: string, on: boolean) =>
        setFilters({ accounts: on ? [...filters.accounts, id] : filters.accounts.filter((each) => each !== id) });
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP_BUTTON} size="sm" variant="outline" />}>
                <span className="truncate">
                    {chosen.size === 0 ? copy.allAccounts : (only ?? `${chosen.size} ${copy.accounts.value}`)}
                </span>
                <HugeiconsIcon className="size-3.5" icon={Caret} />
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture">
                <Menu.Item onClick={() => setFilters({ accounts: [] })}>{copy.allAccounts}</Menu.Item>
                <Menu.Separator />
                {accounts.map((account) => (
                    <Menu.CheckboxItem
                        checked={chosen.has(account.localId)}
                        key={account.localId}
                        onCheckedChange={(on) => toggle(account.localId, on)}
                    >
                        {account.name}
                    </Menu.CheckboxItem>
                ))}
            </Menu.Content>
        </Menu>
    );
}

function CategoryChip({ filters, ledger, setFilters }: Dashboard) {
    const { filters: copy } = useIntlayer("dashboard");
    const categoryName = useCategoryName();
    const category = filters.category === null ? undefined : ledger.categories.get(filters.category);
    if (!category) {
        return null;
    }
    return (
        <Chip
            className="h-8 max-w-64 min-w-0 shrink text-sm font-medium"
            onRemove={() => setFilters({ category: null })}
            removeLabel={copy.removeCategory({ name: categoryName(category) }).value}
            style={{ backgroundColor: `color-mix(in srgb, ${category.color} 18%, transparent)` }}
        >
            <span className="truncate">{categoryName(category)}</span>
        </Chip>
    );
}

function FilterBar() {
    const dashboard = useContext(DashboardContext);
    if (!dashboard) {
        return null;
    }
    return (
        <>
            <PeriodChip {...dashboard} />
            <AccountsChip {...dashboard} />
            <CategoryChip {...dashboard} />
        </>
    );
}

export function TopBar({ children, title }: { children?: ReactNode; title: ReactNode }) {
    const { add } = useIntlayer("dashboard");
    return (
        <header className="border-border flex min-h-13 shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2">
            <h1 className="mr-1 text-base font-medium">{title}</h1>
            <FilterBar />
            {children}
            <Button
                className="ml-auto h-8 gap-1.5 px-3 text-sm"
                disabled
                size="sm"
                title={add.hint.value}
                variant="outline"
            >
                <HugeiconsIcon className="size-3.5" icon={Add} />
                {add.label}
            </Button>
        </header>
    );
}
