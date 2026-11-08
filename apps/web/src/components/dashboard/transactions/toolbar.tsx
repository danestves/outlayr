import {
    RiAddLine,
    RiArrowDownSLine,
    RiCalendarLine,
    RiDownload2Line,
    RiMoneyDollarCircleLine,
} from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { usePeriodKeys } from "@/components/dashboard/shell/period-keys";
import { periodOf } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AccountMenu, CategoryMenu } from "../home/filter-bar";
import { useDateFormat, usePeriodTitle } from "../home/format";
import type { Span } from "./model";
import type { PageQuery, SearchPatch } from "./search";

const FIELD =
    "border-border focus:border-app-tint h-9 w-full rounded-[10px] border bg-transparent px-2.5 text-[13px] outline-none pointer-coarse:text-base";

function AmountMenu({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const { ledger } = useDashboard();
    const { amount: copy } = useIntlayer("dashboard-transactions");
    const { filters } = useIntlayer("dashboard");
    const { money } = useDisplayFormat();
    const on = query.min !== null || query.max !== null;
    const bound = (value: number | null) => (value === null ? "" : money(value, ledger.currency));
    const field = (key: "max" | "min") => (
        <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">{copy[key]}</span>
            <input
                className={`${FIELD} dash-figure`}
                inputMode="decimal"
                min={0}
                onChange={(event) => setSearch({ [key]: event.target.value })}
                onKeyDown={(event) => event.stopPropagation()}
                step="any"
                type="number"
                value={query[key] ?? ""}
            />
        </label>
    );
    return (
        <Menu>
            <Menu.Trigger className="dash-chip" data-on={on}>
                {on ? <RiMoneyDollarCircleLine size={14} /> : <RiAddLine className="-ml-0.5" size={14} />}
                {on ? `${bound(query.min) || "0"} - ${bound(query.max) || "∞"}` : copy.chip}
            </Menu.Trigger>
            <Menu.Content className="app-shell dash-menu ph-no-capture w-[260px] gap-2 p-3" sideOffset={8}>
                <div className="grid grid-cols-2 gap-2">
                    {field("min")}
                    {field("max")}
                </div>
                {on ? (
                    <Menu.Item
                        className="dash-menu-item text-muted-foreground"
                        onClick={() => setSearch({ max: null, min: null })}
                    >
                        {filters.clear}
                    </Menu.Item>
                ) : null}
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
    const segment = (span: Span, label: string) => (
        <button className="dash-seg" data-on={active === span} onClick={() => pick(span)} type="button">
            {label}
        </button>
    );
    const day = (key: "from" | "to") => (
        <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">{words[key]}</span>
            <input
                className={`${FIELD} dash-figure`}
                max={ledger.today}
                onChange={(event) => setSearch({ [key]: event.target.value, span: null })}
                onKeyDown={(event) => event.stopPropagation()}
                type="date"
                value={query.custom[key] ?? ""}
            />
        </label>
    );
    return (
        <div className="bg-app-group inline-flex shrink-0 rounded-[10px] p-[3px] lg:ml-auto">
            <Menu>
                <Menu.Trigger className="dash-seg gap-1" data-on={active === "month"}>
                    {title(filters.period)}
                    <RiArrowDownSLine className="text-muted-foreground" size={14} />
                </Menu.Trigger>
                <Menu.Content className="app-shell dash-menu ph-no-capture max-h-80 overflow-y-auto" sideOffset={8}>
                    {keys.map((key) => (
                        <Menu.Item
                            className="dash-menu-item"
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
            {segment("quarter", copy.quarter.value)}
            {segment("year", copy.year.value)}
            {segment("all", words.all.value)}
            <Menu>
                <Menu.Trigger aria-label={words.range.value} className="dash-seg gap-1.5" data-on={active === "dates"}>
                    <RiCalendarLine size={14} />
                    {custom ? (
                        <span className="dash-figure">
                            {query.custom.from ? date.day(query.custom.from) : "…"} -{" "}
                            {query.custom.to ? date.day(query.custom.to) : "…"}
                        </span>
                    ) : null}
                </Menu.Trigger>
                <Menu.Content className="app-shell dash-menu ph-no-capture w-[280px] gap-2 p-3" sideOffset={8}>
                    <div className="grid grid-cols-2 gap-2">
                        {day("from")}
                        {day("to")}
                    </div>
                </Menu.Content>
            </Menu>
        </div>
    );
}

interface ToolbarProps {
    onExport: () => void;
    query: PageQuery;
    setSearch: (patch: SearchPatch) => void;
    setup: boolean;
}

export function Toolbar({ onExport, query, setSearch, setup }: ToolbarProps) {
    const { add } = useIntlayer("dashboard");
    const words = useIntlayer("dashboard-transactions");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-2 py-3.5 max-lg:-mx-4 max-lg:[scrollbar-width:none] max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] max-lg:px-4 max-sm:min-h-0 max-sm:py-3">
            {setup ? null : (
                <>
                    <AccountMenu quiet={false} />
                    <CategoryMenu />
                    <AmountMenu query={query} setSearch={setSearch} />
                </>
            )}
            <SpanControl query={query} setSearch={setSearch} />
            {setup ? null : (
                <button className="dash-ob h-9 shrink-0 px-3" onClick={onExport} type="button">
                    <RiDownload2Line size={15} />
                    {words.export}
                </button>
            )}
            <button aria-disabled className="dash-btn shrink-0 max-lg:hidden" title={add.hint.value} type="button">
                <RiAddLine size={18} />
                {add.entry}
            </button>
        </div>
    );
}
