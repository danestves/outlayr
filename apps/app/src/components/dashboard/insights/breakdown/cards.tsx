import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { MerchantTile } from "@/components/ledger/tiles";

import { Card, FIGURE, Track, onwardSearch } from "../parts";
import type { Onward } from "../parts";
import { useBox } from "../use-box";
import { Tip } from "./chart";
import { axisFor } from "./model";
import type { BreakdownRow, Flow, Subs, Weekly } from "./model";
import { CELL_BASE, HEAD, NUM, OpenButton, Row, Table } from "./parts";

const PERCENT = 100;
const DONUT = 280;
const COMPARE_HEIGHT = 256;
const COMPARE_FOOT = 22;
const COMPARE_HEAD = 16;
const COMPARE_GUTTER = 34;
const COMPARE_BAR = 46;
const COMPARE_SHOWN = 7;
const PAIR_GAP = 6;
const BAR_RADIUS = 4;
const SHOWN_ENTRIES = 5;

interface TopMerchantsProps {
    format: (value: number) => string;
    onOpen: (row: BreakdownRow) => void;
    rows: readonly BreakdownRow[];
}

export function TopMerchants({ format, onOpen, rows }: TopMerchantsProps) {
    const { cards } = useIntlayer("dashboard-insights-breakdown");
    const max = Math.max(...rows.map((row) => Math.abs(row.amount)), 0);
    return (
        <Card
            action={<span aria-hidden className="block h-6" />}
            panelClassName="px-5 pt-0 pb-3"
            title={cards.topMerchants}
        >
            {rows.map((row) => (
                <button
                    className="hover:bg-app-hover focus-visible:ring-ring -mx-2 flex h-[54px] items-center gap-3 rounded-md px-2 text-left text-[13px] font-medium outline-none focus-visible:ring-2"
                    key={row.id}
                    onClick={() => onOpen(row)}
                    type="button"
                >
                    <span className="flex w-[170px] shrink-0 items-center gap-2.5">
                        <MerchantTile name={row.name} size="md" />
                        <span className="truncate">{row.name}</span>
                    </span>
                    <span aria-hidden className="bg-muted block h-5 min-w-0 flex-1 overflow-hidden rounded-[5px]">
                        <span
                            className="block h-full rounded-[5px]"
                            style={{
                                background: row.color,
                                width: `${max > 0 ? (Math.abs(row.amount) / max) * 100 : 0}%`,
                            }}
                        />
                    </span>
                    <span className={`${FIGURE} w-[90px] shrink-0 text-right text-sm font-normal`}>
                        {format(row.amount)}
                    </span>
                </button>
            ))}
        </Card>
    );
}

interface DonutProps {
    of: string;
    onSelect: (id: string) => void;
    parts: readonly { amount: number; color: string; id: string; name: string }[];
    tagged: string;
}

const DONUT_OUTER = 132;
const DONUT_INNER = 92;
const DONUT_GAP = 0.03;

const arcPoint = (radius: number, angle: number) =>
    `${DONUT / 2 + radius * Math.cos(angle)} ${DONUT / 2 + radius * Math.sin(angle)}`;

const arcPath = (from: number, to: number) => {
    const large = to - from > Math.PI ? 1 : 0;
    return `M${arcPoint(DONUT_OUTER, from)}A${DONUT_OUTER} ${DONUT_OUTER} 0 ${large} 1 ${arcPoint(DONUT_OUTER, to)}L${arcPoint(DONUT_INNER, to)}A${DONUT_INNER} ${DONUT_INNER} 0 ${large} 0 ${arcPoint(DONUT_INNER, from)}Z`;
};

export function TagDonut({ of, onSelect, parts, tagged }: DonutProps) {
    const { cards } = useIntlayer("dashboard-insights-breakdown");
    const [active, setActive] = useState<string | null>(null);
    const sum = parts.reduce((all, part) => all + Math.abs(part.amount), 0);
    const swept = parts.map((part) => ({
        part,
        sweep: sum === 0 ? 0 : (Math.abs(part.amount) / sum) * Math.PI * 2,
    }));
    const arcs = swept.map(({ part, sweep }, index) => {
        const from = swept.slice(0, index).reduce((angle, each) => angle + each.sweep, -Math.PI / 2);
        return { from, part, to: from + Math.max(sweep - DONUT_GAP, 0) };
    });
    return (
        <Card panelClassName="px-5 pt-1.5 pb-4" title={cards.taggedSpend}>
            <svg
                aria-label={cards.taggedSpend.value}
                className="block"
                height={DONUT}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
                role="img"
                width={DONUT}
            >
                {arcs.map(({ from, part, to }) => (
                    <path
                        aria-label={part.name}
                        className="cursor-pointer transition-opacity outline-none"
                        d={arcPath(from, to)}
                        fill={part.color}
                        key={part.id}
                        onClick={() => onSelect(part.id)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                onSelect(part.id);
                            }
                        }}
                        onPointerEnter={() => setActive(part.id)}
                        onPointerLeave={() => setActive(null)}
                        opacity={active === null || active === part.id ? 1 : 0.4}
                        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an SVG path cannot be a button element.
                        role="button"
                        tabIndex={0}
                    />
                ))}
                <text
                    className={`${FIGURE} text-[22px] font-semibold`}
                    fill="var(--color-foreground)"
                    style={{ textAnchor: "middle" }}
                    x={DONUT / 2}
                    y={DONUT / 2 - 4}
                >
                    {tagged}
                </text>
                <text
                    fill="var(--color-muted-foreground)"
                    style={{ fontSize: 12, textAnchor: "middle" }}
                    x={DONUT / 2}
                    y={DONUT / 2 + 16}
                >
                    {of}
                </text>
            </svg>
        </Card>
    );
}

const WEEK_HEIGHT = 360;
const WEEK_FOOT = 22;
const WEEK_GUTTER = 38;
const WEEK_TOP = 10;
const WEEK_BAR_SHARE = 0.5;
const WEEK_RADIUS = 4;
const WEEK_DIM = 0.55;
const WEEK_CAP_STEP = 20;
const WEEK_HEADROOM = 1.1;

interface TagWeeksProps {
    color: string;
    compact: (value: number) => string;
    label: string;
    rangeOf: (week: Weekly) => string;
    whole: (value: number) => string;
    weeks: readonly Weekly[];
}

/** One tag's weeks as bars; the biggest week is lit until another is hovered. */
export function TagWeeks({ color, compact, label, rangeOf, weeks, whole }: TagWeeksProps) {
    const [ref, { width }] = useBox();
    const [hovered, setHovered] = useState<number | null>(null);
    const values = weeks.map((week) => Math.abs(week.value));
    const top = Math.max(...values, 0);
    const axis = axisFor([top]);
    const cap = Math.max(Math.ceil((top * WEEK_HEADROOM) / WEEK_CAP_STEP) * WEEK_CAP_STEP, WEEK_CAP_STEP, axis.cap);
    const base = WEEK_HEIGHT - WEEK_FOOT;
    const yOf = (value: number) => base - (value / cap) * (base - WEEK_TOP);
    const lit = hovered ?? values.indexOf(top);
    const slot = (width - WEEK_GUTTER) / Math.max(weeks.length, 1);
    return (
        <div className="w-full" ref={ref} style={{ height: WEEK_HEIGHT }}>
            {width > 0 ? (
                <svg
                    aria-label={label}
                    className="block"
                    height={WEEK_HEIGHT}
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
                    role="img"
                    width={width}
                >
                    {axis.ticks.map((tick) => (
                        <g key={tick}>
                            <path d={`M${WEEK_GUTTER} ${yOf(tick)}H${width}`} stroke="var(--color-border)" />
                            <text
                                className={`${FIGURE} text-[11px]`}
                                fill="var(--color-muted-foreground)"
                                x={0}
                                y={yOf(tick) + 4}
                            >
                                {tick === 0 ? "0" : compact(tick)}
                            </text>
                        </g>
                    ))}
                    {weeks.map((week, index) => {
                        const bar = slot * WEEK_BAR_SHARE;
                        const x = WEEK_GUTTER + index * slot + (slot - bar) / 2;
                        const y = yOf(values[index] ?? 0);
                        return (
                            <g
                                key={week.label.from}
                                onPointerEnter={() => setHovered(index)}
                                onPointerLeave={() => setHovered(null)}
                            >
                                <rect
                                    fill={color}
                                    fillOpacity={index === lit ? 1 : WEEK_DIM}
                                    height={Math.max(base - y, 2)}
                                    rx={WEEK_RADIUS}
                                    width={bar}
                                    x={x}
                                    y={y}
                                />
                                <text
                                    className={`${FIGURE} text-xs`}
                                    fill="var(--color-foreground)"
                                    style={{ textAnchor: "middle" }}
                                    x={x + bar / 2}
                                    y={y - 6}
                                >
                                    {whole(week.value)}
                                </text>
                                <text
                                    className={`${FIGURE} text-[11px]`}
                                    fill="var(--color-muted-foreground)"
                                    style={{ textAnchor: "middle" }}
                                    x={x + bar / 2}
                                    y={WEEK_HEIGHT - 4}
                                >
                                    {rangeOf(week)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            ) : null}
        </div>
    );
}

interface CompareChartProps {
    baseLabel: string;
    compact: (value: number) => string;
    whole: (value: number) => string;
    currentLabel: string;
    format: (value: number) => string;
    rows: readonly BreakdownRow[];
}

export function CompareChart({ baseLabel, compact, whole, currentLabel, format, rows }: CompareChartProps) {
    const [ref, { width }] = useBox();
    const [active, setActive] = useState<string | null>(null);
    const shown = rows
        .toSorted(
            (a, b) => Math.max(Math.abs(b.amount), Math.abs(b.base)) - Math.max(Math.abs(a.amount), Math.abs(a.base))
        )
        .slice(0, COMPARE_SHOWN);
    const axis = axisFor(shown.flatMap((row) => [row.amount, row.base]));
    const gap = (width - COMPARE_GUTTER) / Math.max(shown.length, 1);
    const bar = Math.min(gap * 0.25, COMPARE_BAR);
    const floor = COMPARE_HEIGHT - COMPARE_FOOT;
    const reach = floor - COMPARE_HEAD;
    const heightOf = (value: number) => Math.max((Math.abs(value) / axis.cap) * reach, 2);
    const hovered = shown.find((row) => row.id === active);
    return (
        <div className="relative w-full" ref={ref} style={{ height: COMPARE_HEIGHT }}>
            {width > 0 ? (
                <svg
                    aria-label={`${baseLabel} / ${currentLabel}`}
                    height={COMPARE_HEIGHT}
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
                    role="img"
                    width={width}
                >
                    {axis.ticks.map((tick) => (
                        <g key={tick}>
                            <path
                                d={`M${COMPARE_GUTTER} ${floor - heightOf(tick)}H${width}`}
                                stroke="var(--color-border)"
                            />
                            <text
                                className={`${FIGURE} text-[11px]`}
                                fill="var(--color-muted-foreground)"
                                x={0}
                                y={floor - heightOf(tick) + 4}
                            >
                                {tick === 0 ? "0" : compact(tick)}
                            </text>
                        </g>
                    ))}
                    {shown.map((row, index) => {
                        const x = COMPARE_GUTTER + index * gap + gap / 2;
                        return (
                            <g
                                key={row.id}
                                onPointerEnter={() => setActive(row.id)}
                                onPointerLeave={() => setActive(null)}
                            >
                                <rect fill="transparent" height={COMPARE_HEIGHT} width={gap} x={x - gap / 2} y={0} />
                                <rect
                                    fill="var(--color-app-strong)"
                                    height={heightOf(row.base)}
                                    rx={BAR_RADIUS}
                                    width={bar}
                                    x={x - bar - PAIR_GAP / 2}
                                    y={floor - heightOf(row.base)}
                                />
                                <rect
                                    fill={row.color}
                                    height={heightOf(row.amount)}
                                    rx={BAR_RADIUS}
                                    width={bar}
                                    x={x + PAIR_GAP / 2}
                                    y={floor - heightOf(row.amount)}
                                />
                                <text
                                    className={`${FIGURE} text-[11px]`}
                                    fill="var(--color-muted-foreground)"
                                    style={{ textAnchor: "middle" }}
                                    x={x - bar / 2 - PAIR_GAP / 2}
                                    y={floor - heightOf(row.base) - 6}
                                >
                                    {whole(row.base)}
                                </text>
                                <text
                                    className={`${FIGURE} text-[11px]`}
                                    fill="var(--color-foreground)"
                                    style={{ textAnchor: "middle" }}
                                    x={x + bar / 2 + PAIR_GAP / 2}
                                    y={floor - heightOf(row.amount) - 6}
                                >
                                    {whole(row.amount)}
                                </text>
                                <text
                                    fill="var(--color-muted-foreground)"
                                    style={{ fontSize: 12, textAnchor: "middle" }}
                                    x={x}
                                    y={COMPARE_HEIGHT - 5}
                                >
                                    {row.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            ) : null}
            {hovered ? (
                <Tip left={COMPARE_GUTTER + shown.indexOf(hovered) * gap + gap / 2} top={COMPARE_HEAD} width={width}>
                    <p className="font-medium">{hovered.name}</p>
                    <p className={`${FIGURE} text-muted-foreground`}>
                        {baseLabel} {format(hovered.base)}
                    </p>
                    <p className={FIGURE}>
                        {currentLabel} {format(hovered.amount)}
                    </p>
                </Tip>
            ) : null}
        </div>
    );
}

const ENTRY_COLUMNS = [214, 154, 135, 111, 128] as const;

export function SubcategoriesCard({
    categoryId,
    color,
    format,
    name,
    rows,
}: {
    categoryId: string;
    name: string;
    color: string;
    format: (value: number) => string;
    rows: readonly Subs[];
}) {
    const { cards } = useIntlayer("dashboard-insights-breakdown");
    const max = Math.max(...rows.map((row) => row.amount), 0);
    return (
        <Card
            className="lg:h-[358px] [&>[data-slot=frame-footer]]:mt-auto"
            footer={
                <>
                    <span className="flex-1" />
                    <OpenButton
                        render={
                            <Link
                                params={{ categoryId }}
                                search={(prev) => ({ accounts: prev.accounts })}
                                to="/settings/categories/$categoryId"
                            />
                        }
                    >
                        {cards.open({ name })}
                    </OpenButton>
                </>
            }
            panelClassName="flex-[0_0_auto] p-0"
            title={cards.subcategories}
        >
            {rows.map((row) => (
                <div className="border-border border-t px-5 py-3" key={row.id}>
                    <div className="flex text-[13px] leading-5 font-medium">
                        <span className="min-w-0 truncate">{row.name}</span>
                        <span className={`${FIGURE} ml-auto font-medium`}>{format(row.amount)}</span>
                        <span className={`${FIGURE} text-muted-foreground w-11 text-right font-normal`}>
                            {`${Math.round(row.share * PERCENT)}%`}
                        </span>
                    </div>
                    <Track className="bg-muted mt-[7px] h-1.5!" color={color} max={max} value={row.amount} />
                </div>
            ))}
        </Card>
    );
}

interface EntriesCardProps {
    accountName: (id: string | null) => string;
    action: { label: string; to: Onward };
    categoryId: string;
    dateOf: (day: string) => string;
    flows: readonly Flow[];
    format: (value: number) => string;
    subName: (row: Flow["row"]) => string;
}

export function EntriesCard({ accountName, action, categoryId, dateOf, flows, format, subName }: EntriesCardProps) {
    const { cards, table } = useIntlayer("dashboard-insights-breakdown");
    const shown = flows.toSorted((a, b) => b.row.at - a.row.at).slice(0, SHOWN_ENTRIES);
    return (
        <Card
            action={
                <OpenButton render={<Link search={onwardSearch(action.to, categoryId)} to={action.to} />}>
                    {action.label}
                </OpenButton>
            }
            className="lg:h-[358px]"
            panelClassName="p-0"
            title={cards.entries}
        >
            <Table className="table-fixed">
                <colgroup>
                    {ENTRY_COLUMNS.map((width) => (
                        <col key={width} style={{ width }} />
                    ))}
                </colgroup>
                <thead>
                    <Row>
                        <th className={`${HEAD} text-left`}>{table.merchant}</th>
                        <th className={`${HEAD} text-left`}>{table.subcategory}</th>
                        <th className={`${HEAD} text-left`}>{table.account}</th>
                        <th className={`${HEAD} text-left`}>{table.date}</th>
                        <th className={`${HEAD} text-right`}>{table.amount}</th>
                    </Row>
                </thead>
                <tbody>
                    {shown.map(({ row }) => {
                        const merchant = row.note || subName(row);
                        return (
                            <Row className="hover:bg-app-hover relative transition-colors" key={row.id}>
                                <td className={`${CELL_BASE} h-[39px]`}>
                                    <Link
                                        className="focus-visible:ring-ring flex items-center gap-2.5 rounded-sm font-medium outline-none after:absolute after:inset-0 focus-visible:ring-2"
                                        search={(prev) => ({ accounts: prev.accounts, entry: row.id })}
                                        to="/transactions"
                                    >
                                        <MerchantTile name={merchant} size="lg" />
                                        <span className="truncate">{merchant}</span>
                                    </Link>
                                </td>
                                <td className={`${CELL_BASE} text-muted-foreground truncate`}>{subName(row)}</td>
                                <td className={`${CELL_BASE} text-muted-foreground truncate`}>
                                    {accountName(row.accountId)}
                                </td>
                                <td className={`${CELL_BASE} ${FIGURE} text-muted-foreground`}>{dateOf(row.day)}</td>
                                <td className={`${CELL_BASE} ${NUM}`}>
                                    {format(row.income ? row.amount : -row.amount)}
                                </td>
                            </Row>
                        );
                    })}
                </tbody>
            </Table>
        </Card>
    );
}
