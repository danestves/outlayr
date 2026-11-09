import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import DollarCircleIcon from "@hugeicons/core-free-icons/DollarCircleIcon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Tabs } from "panelui-web/tabs";
import type { KeyboardEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { usePeriodKeys } from "@/components/dashboard/shell/period-keys";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AccountMenu, CategoryMenu } from "../home/filter-bar";
import { useDateFormat, usePeriodTitle } from "../home/format";
import { ENTRY_TYPES } from "./model";
import type { Span } from "./model";
import type { PageQuery, SearchPatch } from "./search";

const SPANS = ["quarter", "year", "all"] as const;

// The menu would take these keys for its typeahead; Escape still has to close it.
const keepTyping = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
        event.stopPropagation();
    }
};

function AmountMenu({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const { ledger } = useDashboard();
    const { amount: copy } = useIntlayer("dashboard-transactions");
    const { filters } = useIntlayer("dashboard");
    const { money } = useDisplayFormat();
    const on = query.min !== null || query.max !== null;
    const bound = (value: number | null) => (value === null ? "" : money(value, ledger.currency));
    const field = (key: "max" | "min") => (
        <Field>
            <Field.Label>{copy[key]}</Field.Label>
            <Input
                className="dash-figure"
                inputMode="decimal"
                min={0}
                onChange={(event) => setSearch({ [key]: event.target.value })}
                onKeyDown={keepTyping}
                size="sm"
                step="any"
                type="number"
                value={query[key] ?? ""}
            />
        </Field>
    );
    return (
        <Menu>
            {/* The same chip as AccountMenu and CategoryMenu beside it, which home/filter-bar owns. */}
            <Menu.Trigger className="dash-chip" data-on={on}>
                {on ? (
                    <HugeiconsIcon icon={DollarCircleIcon} size={14} />
                ) : (
                    <HugeiconsIcon icon={Add01Icon} className="-ml-0.5" size={14} />
                )}
                {on ? `${bound(query.min) || "0"} - ${bound(query.max) || "∞"}` : copy.chip}
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture w-[260px]" sideOffset={8}>
                <div className="grid grid-cols-2 gap-2 p-2">
                    {field("min")}
                    {field("max")}
                </div>
                {on ? <Menu.Item onClick={() => setSearch({ max: null, min: null })}>{filters.clear}</Menu.Item> : null}
            </Menu.Content>
        </Menu>
    );
}

/** A phone's period, types and amount share the chip row, since the card has no room for their tabs. */
function PeriodChip({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const { span: words } = useIntlayer("dashboard-transactions");
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const keys = usePeriodKeys(dashboard);
    const spanNames = { all: words.all, quarter: copy.quarter, year: copy.year };
    const pick = (patch: SearchPatch) => setSearch({ from: null, to: null, ...patch });
    return (
        <Menu>
            <Menu.Trigger className="dash-chip shrink-0 sm:hidden" data-on>
                {query.span ? spanNames[query.span] : title(filters.period)}
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture max-h-80 overflow-y-auto" sideOffset={8}>
                {SPANS.map((span) => (
                    <Menu.Item key={span} onClick={() => pick({ span })}>
                        {spanNames[span]}
                    </Menu.Item>
                ))}
                <Menu.Separator />
                {keys.map((key) => (
                    <Menu.Item
                        key={key}
                        onClick={() => pick({ period: key === filters.currentKey ? null : key, span: null })}
                    >
                        {title(periodOf(key, ledger.firstDayOfMonth))}
                    </Menu.Item>
                ))}
            </Menu.Content>
        </Menu>
    );
}

function TypeChip({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const { transactions: home } = useIntlayer("dashboard-home");
    const words = useIntlayer("dashboard-transactions");
    const names = { expenses: home.expenses, income: home.incomeTab, transfers: words.transfers };
    return (
        <Menu>
            <Menu.Trigger className="dash-chip shrink-0 sm:hidden" data-on={query.type !== undefined}>
                {query.type ? null : <HugeiconsIcon icon={Add01Icon} className="-ml-0.5" size={14} />}
                {query.type ? names[query.type] : words.csv.type}
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture" sideOffset={8}>
                <Menu.Item onClick={() => setSearch({ type: null })}>{home.all}</Menu.Item>
                {ENTRY_TYPES.map((type) => (
                    <Menu.Item key={type} onClick={() => setSearch({ type })}>
                        {names[type]}
                    </Menu.Item>
                ))}
            </Menu.Content>
        </Menu>
    );
}

function SpanControl({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const { span: words } = useIntlayer("dashboard-transactions");
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const date = useDateFormat();
    const keys = usePeriodKeys(dashboard);
    const custom = query.custom.from !== undefined || query.custom.to !== undefined;
    const active: Span | "dates" | "month" = custom ? "dates" : (query.span ?? "month");
    const pick = (span: Span | null) => setSearch({ from: null, span, to: null });
    const day = (key: "from" | "to") => (
        <Field>
            <Field.Label>{words[key]}</Field.Label>
            <Input
                className="dash-figure appearance-none"
                max={ledger.today}
                onChange={(event) => setSearch({ [key]: event.target.value, span: null })}
                onKeyDown={keepTyping}
                size="sm"
                type="date"
                value={query.custom[key] ?? ""}
            />
        </Field>
    );
    return (
        <Tabs
            className="shrink-0 max-sm:hidden lg:ml-auto"
            onValueChange={(next) => {
                // Month and dates open a menu, and the tab moves only once its menu picks something.
                const span = SPANS.find((each) => each === next);
                if (span) {
                    pick(span);
                }
            }}
            value={active}
        >
            <Tabs.List>
                <Menu>
                    <Menu.Trigger render={<Tabs.Trigger value="month" />}>{title(filters.period)}</Menu.Trigger>
                    <Menu.Content className="app-shell ph-no-capture max-h-80 overflow-y-auto" sideOffset={8}>
                        {keys.map((key) => (
                            <Menu.Item
                                key={key}
                                onClick={() =>
                                    setSearch({
                                        from: null,
                                        period: key === filters.currentKey ? null : key,
                                        span: null,
                                        to: null,
                                    })
                                }
                            >
                                {title(periodOf(key, ledger.firstDayOfMonth))}
                            </Menu.Item>
                        ))}
                    </Menu.Content>
                </Menu>
                <Tabs.Trigger value="quarter">{copy.quarter}</Tabs.Trigger>
                <Tabs.Trigger value="year">{copy.year}</Tabs.Trigger>
                <Tabs.Trigger value="all">{words.all}</Tabs.Trigger>
                <Menu>
                    <Menu.Trigger aria-label={words.range.value} render={<Tabs.Trigger value="dates" />}>
                        <HugeiconsIcon icon={Calendar03Icon} size={14} />
                        {custom ? (
                            <span className="dash-figure">
                                {query.custom.from ? date.day(query.custom.from) : "…"} -{" "}
                                {query.custom.to ? date.day(query.custom.to) : "…"}
                            </span>
                        ) : null}
                    </Menu.Trigger>
                    <Menu.Content className="app-shell ph-no-capture w-[280px]" sideOffset={8}>
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {day("from")}
                            {day("to")}
                        </div>
                    </Menu.Content>
                </Menu>
            </Tabs.List>
        </Tabs>
    );
}

interface FilterBarProps {
    onExport: () => void;
    query: PageQuery;
    setSearch: (patch: SearchPatch) => void;
    setup: boolean;
}

export function FilterBar({ onExport, query, setSearch, setup }: FilterBarProps) {
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    const words = useIntlayer("dashboard-transactions");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 max-lg:-mx-4 max-lg:[scrollbar-width:none] max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] max-lg:px-4 max-sm:min-h-0 max-sm:py-3">
            <PeriodChip query={query} setSearch={setSearch} />
            {setup ? null : (
                <>
                    <AccountMenu quiet={false} />
                    <CategoryMenu />
                    <TypeChip query={query} setSearch={setSearch} />
                    <AmountMenu query={query} setSearch={setSearch} />
                </>
            )}
            <SpanControl query={query} setSearch={setSearch} />
            {setup ? null : (
                <Button className="shrink-0 max-sm:hidden" onClick={onExport} variant="outline">
                    <HugeiconsIcon icon={Download01Icon} size={15} />
                    {words.export}
                </Button>
            )}
            <Button className="shrink-0 max-lg:hidden" onClick={() => open({ kind: "entry" })}>
                <HugeiconsIcon icon={Add01Icon} size={18} />
                {add.entry}
            </Button>
        </div>
    );
}
