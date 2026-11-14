import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { useSearch } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useGoalMoney } from "@/components/dashboard/goals/parts";
import { useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useBox } from "@/components/dashboard/insights/use-box";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { periodKeyOf, periodKindOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";

import { useBudgetFlows } from "./flow-context";
import { MONTHS_AHEAD } from "./model";
import type { BudgetLine, LineStatus } from "./model";

export const BADGE = "h-[22px] rounded-md px-2 text-xs font-medium normal-nums";
export const TINT = "var(--color-app-tint)";
export const BAD = "var(--color-app-spend)";
export const OK = "var(--color-app-income)";
const TRACK = "var(--color-app-strong)";
const INK = "var(--color-app-ink)";
const GROUND = "var(--color-app-bg)";
const TICK = "dash-figure text-[11px]";
const MUTED_FILL = "var(--color-muted-foreground)";
const GRID = "var(--color-border)";

export const quiet = (children: ReactNode) => (
    <span className="text-muted-foreground min-w-0 truncate text-[13px] leading-5">{children}</span>
);

export function useMonthNames() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const long = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" });
        const short = new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, { month: "short", timeZone: "UTC" });
        const month = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        const capital = (text: string) => `${text.charAt(0).toLocaleUpperCase(date)}${text.slice(1)}`;
        return {
            /** "October 2026" */
            long: (key: string) => capital(long.format(wallNoon(`${key.slice(0, 7)}-15`))),
            /** "October" */
            month: (key: string) => capital(month.format(wallNoon(`${key.slice(0, 7)}-15`))),
            /** "Oct", from a month key or any day in it */
            short: (key: string) => capital(short.format(wallNoon(`${key.slice(0, 7)}-15`)).replace(".", "")),
        };
    }, [date]);
}

/** The month the budgets screens read; unlike the other screens it reaches `MONTHS_AHEAD` past the current one. */
export function useBudgetMonth() {
    const { ledger, setFilters } = useDashboard();
    const raw = useSearch({ from: "/_account/_app", select: (search) => search.period });
    const current = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    const last = shiftPeriodKey(current, MONTHS_AHEAD);
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const first = periodKeyOf(earliest, ledger.firstDayOfMonth);
    let key = current;
    if (raw !== undefined && periodKindOf(raw) === "month" && raw <= last) {
        key = raw < first ? first : raw;
    }
    const period = useMemo(() => periodOf(key, ledger.firstDayOfMonth), [key, ledger.firstDayOfMonth]);
    const go = (next: string) => setFilters({ period: next === current ? null : next });
    return {
        canNext: key < last,
        canPrev: key > first,
        current,
        go,
        key,
        period,
        step: (steps: number) => go(shiftPeriodKey(key, steps)),
    };
}

export function Stepper({
    canNext,
    canPrev,
    label,
    next,
    onStep,
    previous,
}: {
    canNext: boolean;
    canPrev: boolean;
    label: string;
    next: string;
    onStep: (steps: number) => void;
    previous: string;
}) {
    const arrow = "text-muted-foreground hover:text-foreground size-7 rounded-md disabled:opacity-40";
    return (
        <span className="bg-foreground/[0.03] inline-flex h-9 items-center gap-0.5 rounded-lg border px-1 text-sm font-medium whitespace-nowrap">
            <Button
                aria-label={previous}
                className={arrow}
                disabled={!canPrev}
                onClick={() => onStep(-1)}
                size="icon"
                variant="ghost"
            >
                <Glyph icon={ArrowLeft01Icon} size={16} />
            </Button>
            <span aria-live="polite" className="dash-figure px-3.5">
                {label}
            </span>
            <Button
                aria-label={next}
                className={arrow}
                disabled={!canNext}
                onClick={() => onStep(1)}
                size="icon"
                variant="ghost"
            >
                <Glyph icon={ArrowRight01Icon} size={16} />
            </Button>
        </span>
    );
}

export function MonthStepper() {
    const copy = useIntlayer("dashboard-budgets");
    const names = useMonthNames();
    const month = useBudgetMonth();
    return (
        <Stepper
            canNext={month.canNext}
            canPrev={month.canPrev}
            label={names.long(month.key)}
            next={copy.next.value}
            onStep={month.step}
            previous={copy.previous.value}
        />
    );
}

export const Dot = ({ color, size = 8 }: { color: string; size?: number }) => (
    <i aria-hidden className="block flex-none rounded-full" style={{ background: color, height: size, width: size }} />
);

export function StatusBadge({ amount, status }: { amount: string; status: LineStatus | "noLimit" }) {
    const copy = useIntlayer("dashboard-budgets").status;
    switch (status) {
        case "over": {
            return (
                <Badge className={BADGE} dot variant="destructive">
                    {copy.over({ amount })}
                </Badge>
            );
        }
        case "onTrack": {
            return (
                <Badge className={BADGE} dot variant="success">
                    {copy.onTrack}
                </Badge>
            );
        }
        case "held": {
            return (
                <Badge className={BADGE} dot variant="success">
                    {copy.held}
                </Badge>
            );
        }
        case "notStarted": {
            return (
                <Badge className={`${BADGE} [&>[data-slot=badge-dot]]:text-muted-foreground`} dot variant="outline">
                    {copy.notStarted}
                </Badge>
            );
        }
        default: {
            return (
                <Badge className={`${BADGE} [&>[data-slot=badge-dot]]:text-muted-foreground`} dot variant="outline">
                    {copy.noLimit}
                </Badge>
            );
        }
    }
}

/** Spent against the limit; past it the bar keeps the limit's share and the overflow reads in red. */
export function UsedBar({ color, limit, spent }: { color: string; limit: number; spent: number }) {
    const over = spent > limit;
    let share = 0;
    if (limit > 0) {
        share = Math.min(1, over ? limit / spent : spent / limit);
    }
    return (
        <span
            aria-hidden
            className="flex h-2 w-full max-w-[210px] gap-0.5 overflow-hidden rounded-full"
            style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }}
        >
            <i className="block h-full rounded-full" style={{ background: color, width: `${share * 100}%` }} />
            {over ? <i className="block h-full flex-1 rounded-full" style={{ background: BAD }} /> : null}
        </span>
    );
}

const BARS = 45;
const GAUGE_FLOOR = 84;
const GAUGE_HEIGHT = 112;
const PILL_WIDTH = 80;
const BAR_WIDTH = 3;

/** A row of bars that swell around the amount spent, with a diamond under `marker`. */
export function PaceGauge({
    currency,
    label,
    limit,
    marker,
    spent,
}: {
    currency: string;
    label: string;
    limit: number;
    marker: number;
    spent: number;
}) {
    const [ref, { width }] = useBox<HTMLElement>();
    const { whole } = useWholeMoney(currency);
    const top = Math.max(spent, limit, 1);
    const spentAt = spent / top;
    const limitAt = limit / top;
    const span = Math.max(width - BAR_WIDTH, 0);
    const bars = Array.from({ length: BARS }, (_, index) => {
        const at = index / (BARS - 1);
        const distance = (at - spentAt) * BARS;
        const swell = Math.exp((-distance * distance) / 22);
        const height = 14 + swell * 40;
        let fill = TRACK;
        if (at <= spentAt) {
            fill = at <= limitAt ? TINT : BAD;
        }
        return { at, fill, height, opacity: at <= spentAt ? 0.5 + swell * 0.5 : 1 };
    });
    const markerX = (marker / top) * span;
    const pillX = Math.max(Math.min(spentAt * span, width - PILL_WIDTH / 2), PILL_WIDTH / 2) - PILL_WIDTH / 2;
    return (
        <figure aria-label={label} className="h-[112px]" ref={ref}>
            {width > 0 ? (
                <svg aria-hidden className="block overflow-visible" height={GAUGE_HEIGHT} width={width}>
                    {bars.map((bar) => (
                        <rect
                            fill={bar.fill}
                            fillOpacity={bar.opacity}
                            height={bar.height}
                            key={bar.at}
                            rx={1.5}
                            width={BAR_WIDTH}
                            x={bar.at * span}
                            y={GAUGE_FLOOR - bar.height}
                        />
                    ))}
                    <rect
                        fill={INK}
                        height={7}
                        rx={1}
                        transform={`rotate(45 ${markerX} 97.5)`}
                        width={7}
                        x={markerX - 3.5}
                        y={94}
                    />
                    <g transform={`translate(${pillX} 0)`}>
                        <rect fill={INK} height={24} rx={6} width={PILL_WIDTH} />
                        <text
                            className="dash-figure"
                            fill={GROUND}
                            style={{ fontSize: 12, fontWeight: 600, textAnchor: "middle" }}
                            x={PILL_WIDTH / 2}
                            y={16.5}
                        >
                            {whole(spent)}
                        </text>
                    </g>
                </svg>
            ) : null}
        </figure>
    );
}

export const Diamond = () => <i aria-hidden className="bg-app-ink block size-[7px] rotate-45 rounded-[1px]" />;

const CHART_LEFT = 44;
const LAST_TICKS = 4;

function tickIndexes(total: number) {
    if (total <= 1) {
        return [0];
    }
    const weekly = total <= 35 ? [0, 7, 14, 21].filter((index) => index < total - 3) : [];
    const spread =
        weekly.length > 0
            ? weekly
            : Array.from({ length: LAST_TICKS }, (_, index) => Math.round((index * (total - 1)) / LAST_TICKS));
    return [...new Set([...spread, total - 1])];
}

const STEP_DIGITS = 1;

/** A rounded ceiling a little above the top value, so the line never touches the frame. */
function chartTop(value: number) {
    if (value <= 0) {
        return 1;
    }
    const step = 10 ** Math.max(Math.floor(Math.log10(value)) - STEP_DIGITS, 0);
    return Math.ceil((value * 1.04) / step) * step;
}

/** Cumulative spending through the window, an even pace up to the limit, and red once it runs past. */
export function PaceChart({
    currency,
    daily,
    from,
    height,
    label,
    limit,
    total,
}: {
    currency: string;
    daily: readonly number[];
    from: string;
    height: number;
    label: string;
    limit: number | null;
    total: number;
}) {
    const [ref, { width }] = useBox<HTMLElement>();
    const { whole } = useWholeMoney(currency);
    const date = useDateFormat();
    const top = chartTop(Math.max(limit ?? 0, ...daily));
    const x = (index: number) => CHART_LEFT + (total > 1 ? index / (total - 1) : 0) * (width - CHART_LEFT);
    const y = (value: number) => height - 22 - (value / top) * (height - 30);
    const line = (start: number, end: number) =>
        daily
            .slice(start, end)
            .map((value, index) => `${index === 0 ? "M" : "L"}${x(start + index).toFixed(1)} ${y(value).toFixed(1)}`)
            .join("");
    const crossed = limit === null ? -1 : daily.findIndex((value) => value > limit);
    const under = crossed === -1 ? line(0, daily.length) : line(0, crossed);
    const past = crossed === -1 ? "" : line(Math.max(crossed - 1, 0), daily.length);
    const ticks = tickIndexes(total);
    const levels = limit === null ? [0] : [0, limit];
    const dayAt = (index: number) => {
        const day = new Date(wallNoon(from) + index * 86_400_000).toISOString().slice(0, 10);
        return date.day(day);
    };
    return (
        <figure aria-label={label} ref={ref} style={{ height }}>
            {width > 0 ? (
                <svg aria-hidden className="block overflow-visible" height={height} width={width}>
                    {levels.map((level) => (
                        <g key={level}>
                            <line stroke={GRID} x1={CHART_LEFT} x2={width} y1={y(level)} y2={y(level)} />
                            <text
                                className={TICK}
                                fill={MUTED_FILL}
                                style={{ textAnchor: "end" }}
                                x={36}
                                y={y(level) + 4}
                            >
                                {whole(level)}
                            </text>
                        </g>
                    ))}
                    {limit === null || total < 2 ? null : (
                        <path
                            d={`M${x(0)} ${y(limit / total)}L${x(total - 1)} ${y(limit)}`}
                            fill="none"
                            stroke={MUTED_FILL}
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                        />
                    )}
                    {under ? <path d={under} fill="none" stroke={TINT} strokeLinejoin="round" strokeWidth={2} /> : null}
                    {past ? <path d={past} fill="none" stroke={BAD} strokeLinejoin="round" strokeWidth={2} /> : null}
                    {ticks.map((index) => {
                        let anchor: "end" | "middle" | "start" = "middle";
                        if (index === 0) {
                            anchor = "start";
                        } else if (index === total - 1) {
                            anchor = "end";
                        }
                        return (
                            <text
                                className={TICK}
                                fill={MUTED_FILL}
                                key={index}
                                style={{ textAnchor: anchor }}
                                x={x(index)}
                                y={height - 4}
                            >
                                {dayAt(index)}
                            </text>
                        );
                    })}
                </svg>
            ) : null}
        </figure>
    );
}

export function ChartLegend() {
    const { pace } = useIntlayer("dashboard-budgets");
    return (
        <span className="text-muted-foreground flex items-center gap-3.5 text-[13px]">
            <span className="flex items-center gap-1.5">
                <i aria-hidden className="bg-app-tint block h-0.5 w-3.5" />
                {pace.spent}
            </span>
            <span className="flex items-center gap-1.5">
                <i aria-hidden className="border-muted-foreground block w-3.5 border-t-2 border-dashed" />
                {pace.even}
            </span>
        </span>
    );
}

/** One bar per window, scaled to the larger of the limit and the biggest spend; `selected` is the one being read. */
export function HistoryBars({
    bars,
    color,
    height,
    limit,
    limitLine = false,
    selected,
}: {
    bars: readonly { key: string; label: string; spent: number }[];
    color: string;
    height: number;
    limit: number | null;
    limitLine?: boolean;
    selected: number;
}) {
    const top = Math.max(limit ?? 0, ...bars.map((bar) => bar.spent), 1);
    return (
        <>
            <div aria-hidden className="relative flex items-end gap-2" style={{ height }}>
                {bars.map((bar, index) => (
                    <i
                        className="block flex-1 rounded-t-[3px]"
                        key={bar.key}
                        style={{
                            background: index === selected ? color : `color-mix(in oklab, ${color} 30%, transparent)`,
                            height: `${(bar.spent / top) * 100}%`,
                        }}
                    />
                ))}
                {limitLine && limit !== null && limit > 0 ? (
                    <i
                        className="border-app-ink absolute inset-x-0 block border-t-[1.5px]"
                        style={{ top: `${(1 - limit / top) * 100}%` }}
                    />
                ) : null}
            </div>
            <div className="mt-1.5 flex gap-2">
                {bars.map((bar) => (
                    <span
                        className="dash-figure text-muted-foreground flex-1 text-center text-[11px] leading-4"
                        key={bar.key}
                    >
                        {bar.label}
                    </span>
                ))}
            </div>
        </>
    );
}

export function BudgetMenu({ line }: { line: BudgetLine }) {
    const { menu } = useIntlayer("dashboard-budgets");
    return (
        <Menu>
            <Menu.Trigger
                aria-label={menu.more({ name: line.customName ?? line.categoryName }).value}
                render={<Button className="text-muted-foreground -mx-1 size-6" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <BudgetMenuItems line={line} />
            </Menu.Content>
        </Menu>
    );
}

export function BudgetMenuItems({ line }: { line: BudgetLine }) {
    const { menu } = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    return (
        <>
            <Menu.Item onClick={() => open({ budgetId: line.id, kind: "edit" })}>
                <Glyph icon={PencilEdit01Icon} size={16} />
                {menu.change}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={() => open({ budgetId: line.id, kind: "delete" })} variant="destructive">
                <Glyph icon={Delete02Icon} size={16} />
                {menu.delete}
            </Menu.Item>
        </>
    );
}

/** A ghost drawn for the light and dark grounds, laid under an empty state. */
export function Ghost({
    className = "",
    height,
    name,
    width = 1158,
}: {
    className?: string;
    height: number;
    name: "budgets" | "month" | "page" | "spending" | "year";
    width?: number;
}) {
    const image = `pointer-events-none absolute top-0 left-0 -z-10 w-full max-w-none select-none ${className}`;
    const size = { height, minWidth: width };
    return (
        <>
            <img
                alt=""
                className={`light-only ${image}`}
                height={height}
                src={`/budgets/${name}.svg`}
                style={size}
                width={width}
            />
            <img
                alt=""
                className={`dark-only ${image}`}
                height={height}
                src={`/budgets/${name}-dark.svg`}
                style={size}
                width={width}
            />
        </>
    );
}

export function useMoney() {
    const { ledger } = useDashboard();
    const money = useGoalMoney();
    return (amount: number, currency = ledger.currency) => money(amount, currency);
}

export function Note({
    children,
    icon,
    iconTone = "",
    tone = "",
}: {
    children: ReactNode;
    icon: IconSvgElement;
    iconTone?: string;
    tone?: string;
}) {
    return (
        <p
            className={`text-muted-foreground flex items-start gap-2 border-t py-[9px] text-[13px] leading-5 last:pb-0 ${tone}`}
        >
            <Glyph icon={icon} className={`mt-0.5 flex-none ${iconTone}`} size={15} />
            <span className="min-w-0">{children}</span>
        </p>
    );
}

export function CardHead({ aside, title }: { aside?: ReactNode; title: ReactNode }) {
    return (
        <Frame.Header>
            <Frame.Title as="h2" className="whitespace-nowrap">
                {title}
            </Frame.Title>
            {aside ? <Frame.Action className="row-span-1 self-center justify-self-end">{aside}</Frame.Action> : null}
        </Frame.Header>
    );
}
