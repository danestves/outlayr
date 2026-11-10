import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { MerchantTile } from "@/components/ledger/tiles";

import { Change, FIGURE, Flat, Swatch, Track } from "../parts";
import type { BreakdownRow, Dimension, Metric } from "./model";
import { CELL, CELL_BASE, HEAD, HEAD_BASE, NUM, Row, Table } from "./parts";

const SHOWN_ROWS = 6;
export const UNTAGGED_ID = "untagged";
const PERCENT = 100;
const ROW_HEIGHT = {
    category: "h-[34px]",
    merchant: "h-[37px]",
    subcategory: "h-[34px]",
    tag: "h-[46px]",
} as const satisfies Record<Dimension, string>;

const HEAD_HEIGHT = { category: "h-8", merchant: "h-8", subcategory: "h-8", tag: "h-10" } as const satisfies Record<
    Dimension,
    string
>;

/** Column widths in px, vs column second to last, as the table reads at the 1160 content width. */
const COLUMN_WIDTHS = {
    category: [203, 244, 208, 143, 99, 216, 47],
    merchant: [321, 144, 144, 144, 143, 218, 44],
    subcategory: [162, 161, 244, 197, 138, 212, 44],
    tag: [169, 296, 265, 157, 227, 44],
} as const satisfies Record<Dimension, readonly number[]>;

export interface TableFormat {
    amount: (value: number) => string;
    categoryName: (row: BreakdownRow) => string;
    delta: (value: number) => string;
    topCategory: (row: BreakdownRow) => { color: string; name: string };
}

interface GroupTableProps {
    baseTotal: number | null;
    count: number;
    dimension: Dimension;
    format: TableFormat;
    metric: Metric;
    onOpen: (row: BreakdownRow) => void;
    rows: readonly BreakdownRow[];
    total: number;
    versus: string;
}

const goodFor = (metric: Metric) => (metric === "spent" ? "down" : "up");

function Delta({
    baseTotal,
    format,
    metric,
    row,
    total = false,
}: {
    total?: boolean;
    baseTotal: number | null;
    format: TableFormat;
    metric: Metric;
    row: Pick<BreakdownRow, "base" | "delta" | "percent">;
}) {
    const { table } = useIntlayer("dashboard-insights-breakdown");
    if (baseTotal === null) {
        return null;
    }
    const fresh = row.percent === null && row.delta !== 0;
    return (
        <>
            {row.delta === 0 ? null : (
                <span className={`${FIGURE} mr-2 ${total ? "" : "text-muted-foreground"}`}>
                    {format.delta(row.delta)}
                </span>
            )}
            {fresh ? <Flat>{table.fresh}</Flat> : <Pill delta={row.percent ?? 0} metric={metric} whole={!total} />}
        </>
    );
}

const toneOf = (delta: number, metric: Metric) => {
    if (delta === 0) {
        return "flat";
    }
    return delta > 0 === (goodFor(metric) === "up") ? "good" : "poor";
};

function Pill({ delta, metric, whole }: { delta: number | null; metric: Metric; whole: boolean }) {
    if (delta === null) {
        return null;
    }
    const percent = whole ? Math.round(delta * PERCENT) : Math.round(delta * PERCENT * 10) / 10;
    return (
        <span className="dash-trend" data-tone={toneOf(percent, metric)}>
            {`${percent > 0 ? "+" : ""}${percent}%`}
        </span>
    );
}

/** The rows a collapsed table leaves out, read as one. */
const restOf = (rows: readonly BreakdownRow[]) => {
    const sum = (pick: (row: BreakdownRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
    const base = sum((row) => row.base);
    const delta = sum((row) => row.delta);
    return {
        amount: sum((row) => row.amount),
        base,
        count: sum((row) => row.count),
        delta,
        percent: base === 0 ? null : delta / Math.abs(base),
    };
};

const shareOf = (value: number, total: number) => (total === 0 ? 0 : Math.round((value / total) * PERCENT));

interface MoreRowProps {
    all: boolean;
    baseTotal: number | null;
    dimension: Dimension;
    format: TableFormat;
    hidden: number;
    largest: number;
    metric: Metric;
    onToggle: () => void;
    rest: ReturnType<typeof restOf> | null;
    shareBase: number;
}

function MoreRow({
    all,
    baseTotal,
    dimension,
    format,
    hidden,
    largest,
    metric,
    onToggle,
    rest,
    shareBase,
}: MoreRowProps) {
    const { table } = useIntlayer("dashboard-insights-breakdown");
    const merchants = dimension === "merchant";
    const subs = dimension === "subcategory";
    return (
        <Row className="hover:bg-app-hover group relative transition-colors">
            <td className={CELL} colSpan={merchants || subs ? 2 : 1}>
                <button
                    className="text-muted-foreground focus-visible:ring-ring rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-2"
                    onClick={onToggle}
                    type="button"
                >
                    {all ? table.collapse : table.more({ count: String(hidden) })}
                </button>
            </td>
            {merchants ? null : (
                <td className={CELL}>
                    {rest ? (
                        <Track
                            className="bg-muted h-1.5! w-full"
                            color="var(--color-app-strong)"
                            max={largest}
                            value={Math.abs(rest.amount)}
                        />
                    ) : null}
                </td>
            )}
            <td className={`${CELL} ${NUM} text-muted-foreground`}>{rest?.count}</td>
            {merchants ? (
                <td className={`${CELL} ${NUM} text-muted-foreground`}>
                    {rest ? format.amount(rest.amount / rest.count) : null}
                </td>
            ) : null}
            <td className={`${CELL} ${NUM}`}>{rest ? format.amount(rest.amount) : null}</td>
            {dimension === "category" ? (
                <td className={`${CELL} ${NUM} text-muted-foreground`}>
                    {rest ? `${shareOf(Math.abs(rest.amount), shareBase)}%` : null}
                </td>
            ) : null}
            {baseTotal === null ? null : (
                <td className={`${CELL} text-right`}>
                    {rest ? <Delta baseTotal={baseTotal} format={format} metric={metric} row={rest} /> : null}
                </td>
            )}
            <td className={`${CELL} text-muted-foreground`}>
                <Glyph icon={all ? ArrowUp01Icon : ArrowDown01Icon} size={14} />
            </td>
        </Row>
    );
}

const TOTAL_LABEL_SPAN = { category: 1, merchant: 1, subcategory: 2, tag: 1 } as const satisfies Record<
    Dimension,
    number
>;

interface TotalRowProps {
    baseTotal: number | null;
    count: number;
    dimension: Dimension;
    format: TableFormat;
    metric: Metric;
    total: number;
}

function TotalRow({ baseTotal, count, dimension, format, metric, total }: TotalRowProps) {
    const { table } = useIntlayer("dashboard-insights-breakdown");
    return (
        <Row className="font-semibold">
            <td className={CELL}>{table.total}</td>
            <td aria-hidden className={CELL} colSpan={TOTAL_LABEL_SPAN[dimension]} />
            <td className={`${CELL} ${NUM}`}>{count}</td>
            {dimension === "merchant" ? <td aria-hidden className={CELL} /> : null}
            <td className={`${CELL} ${NUM}`}>{format.amount(total)}</td>
            {dimension === "category" ? <td className={`${CELL} ${NUM}`}>{PERCENT}%</td> : null}
            {baseTotal === null ? null : (
                <td className={`${CELL} text-right`}>
                    <Delta
                        baseTotal={baseTotal}
                        format={format}
                        metric={metric}
                        total
                        row={{
                            base: baseTotal,
                            delta: total - baseTotal,
                            percent: baseTotal === 0 ? null : (total - baseTotal) / Math.abs(baseTotal),
                        }}
                    />
                </td>
            )}
            <td aria-hidden className={CELL} />
        </Row>
    );
}

export function GroupTable({
    baseTotal,
    count,
    dimension,
    format,
    metric,
    onOpen,
    rows,
    total,
    versus,
}: GroupTableProps) {
    const { table } = useIntlayer("dashboard-insights-breakdown");
    const [all, setAll] = useState(false);
    const live = rows.filter((row) => row.count > 0);
    const shown = all ? live : live.slice(0, SHOWN_ROWS);
    const hidden = live.length - shown.length;
    const rest = hidden > 0 ? restOf(live.slice(shown.length)) : null;
    const flowTotal = live.reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const largest = Math.max(...live.map((row) => Math.abs(row.amount)), 0);
    const shareBase = metric === "net" ? flowTotal : Math.abs(total);
    const merchants = dimension === "merchant";
    const subs = dimension === "subcategory";
    const named = table[dimension];
    const cell = `${ROW_HEIGHT[dimension]} ${CELL_BASE}`;
    const head = `${HEAD_HEIGHT[dimension]} ${HEAD_BASE}`;
    const columns: readonly number[] = COLUMN_WIDTHS[dimension];
    const widths = baseTotal === null ? columns.toSpliced(-2, 1) : columns;
    return (
        <Table className="table-fixed">
            <colgroup>
                {widths.map((width, index) => (
                    <col key={index} style={{ width }} />
                ))}
            </colgroup>
            <thead>
                <Row>
                    <th className={`${head} text-left`}>{named}</th>
                    {merchants ? <th className={`${head} text-left`}>{table.topCategory}</th> : null}
                    {subs ? <th className={`${head} text-left`}>{table.category}</th> : null}
                    {merchants ? null : <th className={`${head} text-left`}>{table.share}</th>}
                    <th className={`${head} text-right`}>{table.entries}</th>
                    {merchants ? <th className={`${head} text-right`}>{table.average}</th> : null}
                    <th className={`${head} text-right`}>{table.amount}</th>
                    {dimension === "category" ? <th className={`${head} text-right`}>{table.ofTotal}</th> : null}
                    {baseTotal === null ? null : <th className={`${head} text-right`}>{versus}</th>}
                    <th aria-hidden className={head} />
                </Row>
            </thead>
            <tbody>
                {shown.map((row) => {
                    const top = format.topCategory(row);
                    const untagged = dimension === "tag" && row.id === UNTAGGED_ID;
                    const tagName = dimension === "tag" && !untagged;
                    return (
                        <Row className="hover:bg-app-hover group relative transition-colors" key={row.id}>
                            <td className={cell}>
                                <button
                                    className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 rounded-sm text-left outline-none after:absolute after:inset-0 focus-visible:ring-2"
                                    disabled={untagged}
                                    onClick={() => onOpen(row)}
                                    type="button"
                                >
                                    {merchants ? <MerchantTile name={row.name} size="md" /> : null}
                                    {merchants || subs || untagged ? null : <Swatch color={row.color} />}
                                    <span
                                        className={`truncate font-medium ${tagName ? FIGURE : ""} ${untagged ? "text-muted-foreground" : ""}`}
                                    >
                                        {format.categoryName(row)}
                                    </span>
                                </button>
                            </td>
                            {merchants ? (
                                <td className={cell}>
                                    <span className="border-border inline-flex h-6 items-center gap-1.5 rounded-md border px-2 align-middle text-xs leading-none font-medium whitespace-nowrap">
                                        <span
                                            aria-hidden
                                            className="size-1.5 rounded-full"
                                            style={{ background: top.color }}
                                        />
                                        {top.name}
                                    </span>
                                </td>
                            ) : null}
                            {subs ? (
                                <td className={cell}>
                                    <span className="text-muted-foreground inline-flex items-center gap-2.5">
                                        <Swatch color={top.color} />
                                        {top.name}
                                    </span>
                                </td>
                            ) : null}
                            {merchants ? null : (
                                <td className={cell}>
                                    <Track
                                        className="bg-muted h-1.5! w-full"
                                        color={row.color}
                                        max={largest}
                                        value={Math.abs(row.amount)}
                                    />
                                </td>
                            )}
                            <td className={`${cell} ${NUM} text-muted-foreground`}>{row.count}</td>
                            {merchants ? (
                                <td className={`${cell} ${NUM} text-muted-foreground`}>
                                    {format.amount(row.count === 0 ? 0 : row.amount / row.count)}
                                </td>
                            ) : null}
                            <td className={`${cell} ${NUM}`}>{format.amount(row.amount)}</td>
                            {dimension === "category" ? (
                                <td className={`${cell} ${NUM} text-muted-foreground`}>
                                    {shareOf(Math.abs(row.amount), shareBase)}%
                                </td>
                            ) : null}
                            {baseTotal === null ? null : (
                                <td className={`${cell} text-right`}>
                                    <Delta baseTotal={baseTotal} format={format} metric={metric} row={row} />
                                </td>
                            )}
                            <td className={`${cell} text-muted-foreground relative`}>
                                {untagged ? null : (
                                    <Glyph
                                        className="transition-transform group-hover:translate-x-0.5"
                                        icon={ArrowRight01Icon}
                                        size={14}
                                    />
                                )}
                            </td>
                        </Row>
                    );
                })}
                {rest || all ? (
                    <MoreRow
                        all={all}
                        baseTotal={baseTotal}
                        dimension={dimension}
                        format={format}
                        hidden={hidden}
                        largest={largest}
                        metric={metric}
                        onToggle={() => setAll(!all)}
                        rest={rest}
                        shareBase={shareBase}
                    />
                ) : null}
                {dimension === "tag" ? null : (
                    <TotalRow
                        baseTotal={baseTotal}
                        count={count}
                        dimension={dimension}
                        format={format}
                        metric={metric}
                        total={total}
                    />
                )}
            </tbody>
        </Table>
    );
}

const COMPARE_COLUMNS = [323, 229, 229, 209, 170] as const;
const CELL_ROW = `h-[46px] ${CELL_BASE}`;

interface CompareTableProps {
    baseLabel: string;
    baseTotal: number;
    currentLabel: string;
    format: TableFormat;
    metric: Metric;
    rows: readonly BreakdownRow[];
    total: number;
}

export function CompareTable({ baseLabel, baseTotal, currentLabel, format, metric, rows, total }: CompareTableProps) {
    const { table } = useIntlayer("dashboard-insights-breakdown");
    const good = goodFor(metric);
    const tone = (delta: number) => {
        if (delta === 0) {
            return "text-muted-foreground";
        }
        return delta > 0 === (good === "up") ? "text-app-income" : "text-destructive";
    };
    return (
        <Table className="table-fixed">
            <colgroup>
                {COMPARE_COLUMNS.map((width) => (
                    <col key={width} style={{ width }} />
                ))}
            </colgroup>
            <thead>
                <Row>
                    <th className={`${HEAD} h-[39px] text-left`}>{table.category}</th>
                    <th className={`${HEAD} h-[39px] text-right`}>{baseLabel}</th>
                    <th className={`${HEAD} h-[39px] text-right`}>{currentLabel}</th>
                    <th className={`${HEAD} h-[39px] text-right`}>{table.change}</th>
                    <th className={`${HEAD} h-[39px] text-right`}>{table.percent}</th>
                </Row>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <Row key={row.id}>
                        <td className={`${CELL_ROW} font-medium`}>
                            <span className="inline-flex items-center gap-2.5">
                                <Swatch color={row.color} />
                                {format.categoryName(row)}
                            </span>
                        </td>
                        <td className={`${CELL_ROW} ${NUM} text-muted-foreground`}>{format.amount(row.base)}</td>
                        <td className={`${CELL_ROW} ${NUM}`}>{format.amount(row.amount)}</td>
                        <td className={`${CELL_ROW} ${NUM} ${tone(row.delta)}`}>{format.delta(row.delta)}</td>
                        <td className={`${CELL_ROW} text-right`}>
                            {row.percent === null ? (
                                <Flat>{table.fresh}</Flat>
                            ) : (
                                <Change delta={row.percent} goodDirection={good} />
                            )}
                        </td>
                    </Row>
                ))}
                <Row className="font-semibold">
                    <td className={CELL_ROW}>{table.total}</td>
                    <td className={`${CELL_ROW} ${NUM}`}>{format.amount(baseTotal)}</td>
                    <td className={`${CELL_ROW} ${NUM}`}>{format.amount(total)}</td>
                    <td className={`${CELL_ROW} ${NUM} ${tone(total - baseTotal)}`}>
                        {format.delta(total - baseTotal)}
                    </td>
                    <td className={`${CELL_ROW} text-right`}>
                        <Change
                            delta={baseTotal === 0 ? null : (total - baseTotal) / Math.abs(baseTotal)}
                            goodDirection={good}
                        />
                    </td>
                </Row>
            </tbody>
        </Table>
    );
}
