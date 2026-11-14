import { Table } from "panelui-web/table";

import type { Dimension, Grouping, Report, ReportRow } from "@/lib/report/model";
import type { Reading } from "@/lib/report/reading";

const HEAT_FLOOR = 6;
const HEAT_RANGE = 44;
const SMALL_CHANGE = 0.005;
const PERCENT = 100;

const HEAD = "bg-card text-muted-foreground h-10 px-3.5 text-xs font-medium first:ps-5 last:pe-3.5";
// Under a phone width the table scrolls sideways, so the column that stays put gets an edge.
const PINNED = "sticky left-0 max-sm:shadow-[inset_-1px_0_var(--color-border)]";
// The total's first cell stays put while the rest scrolls under it, so it needs a fill nothing shows through.
const TOTAL_FILL = "bg-[color-mix(in_oklab,var(--color-foreground)_3%,var(--color-card))]";
const CELL = "dash-figure h-10 px-3.5 py-0 text-sm tracking-[-0.02em] whitespace-nowrap first:ps-5 last:pe-3.5";

function heat(color: string | null, value: number, low: number, high: number) {
    if (color === null || high === low) {
        return undefined;
    }
    const share = Math.round(HEAT_FLOOR + ((value - low) / (high - low)) * HEAT_RANGE);
    return { background: `color-mix(in oklab, ${color} ${share}%, transparent)` };
}

const percent = (change: number) =>
    Math.abs(change) < SMALL_CHANGE ? "0%" : `${change > 0 ? "+" : ""}${Math.round(change * PERCENT)}%`;

function toneOf(change: number, measure: Report["measure"]) {
    if (Math.abs(change) < SMALL_CHANGE || measure === "count" || measure === "average") {
        return "";
    }
    const rising = change > 0;
    const good = measure === "spending" ? !rising : rising;
    return good ? "text-app-income" : "text-app-spend";
}

interface PivotProps {
    grouping: Grouping;
    kind: Dimension;
    report: Report;
    words: Reading;
}

export function Pivot({ grouping, kind, report, words }: PivotProps) {
    const { copy } = words;
    const { columns, measure, rows, totals } = report;
    const compare = totals.change !== null;
    const last = columns.at(-1);
    const show = (value: number) => words.measureValue(measure, value);
    const cells = (row: ReportRow, tinted: boolean) => {
        const low = Math.min(...row.values);
        const high = Math.max(...row.values);
        return row.values.map((value, index) => (
            <Table.Cell
                align="end"
                className={CELL}
                key={columns[index]?.key ?? index}
                style={tinted ? heat(row.label.color, value, low, high) : undefined}
            >
                {show(value)}
            </Table.Cell>
        ));
    };
    const trailing = (row: ReportRow, strong: boolean) =>
        grouping === "none" ? null : (
            <>
                <Table.Cell align="end" className={`${CELL} ${strong ? "" : "text-muted-foreground"}`}>
                    {show(row.average)}
                </Table.Cell>
                {compare ? (
                    <Table.Cell
                        align="end"
                        className={`${CELL} ${strong ? "font-semibold" : ""} ${row.change === null ? "text-muted-foreground" : toneOf(row.change, measure)}`}
                    >
                        {row.change === null ? "–" : percent(row.change)}
                    </Table.Cell>
                ) : null}
            </>
        );
    return (
        <Table className="w-full min-w-max" containerClassName="overflow-x-auto" maxHeight="none">
            <Table.Header>
                <Table.Row>
                    <Table.Head className={`${HEAD} ${PINNED}`}>{copy.dimensions[kind]}</Table.Head>
                    {columns.map((column) => (
                        <Table.Head align="end" className={HEAD} key={column.key}>
                            {words.columnName(grouping, column, columns)}
                        </Table.Head>
                    ))}
                    {grouping === "none" ? null : (
                        <>
                            <Table.Head align="end" className={HEAD}>
                                {copy.table.average}
                            </Table.Head>
                            {compare && last ? (
                                <Table.Head align="end" className={HEAD}>
                                    {copy.table.versus({ column: words.columnName(grouping, last, columns) })}
                                </Table.Head>
                            ) : null}
                        </>
                    )}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {rows.map((row) => (
                    <Table.Row className="hover:bg-muted/40" key={row.label.id}>
                        <Table.Cell className={`${CELL} bg-card ${PINNED} font-sans font-medium tracking-normal`}>
                            <span className="flex items-center gap-[9px]">
                                <span
                                    aria-hidden
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ background: row.label.color ?? "currentColor" }}
                                />
                                {row.label.name}
                            </span>
                        </Table.Cell>
                        {cells(row, columns.length > 1)}
                        {trailing(row, false)}
                    </Table.Row>
                ))}
                <Table.Row className={`${TOTAL_FILL} font-semibold`}>
                    <Table.Cell className={`${CELL} ${TOTAL_FILL} ${PINNED} font-sans tracking-normal`}>
                        {copy.table.total}
                    </Table.Cell>
                    {cells(totals, false)}
                    {trailing(totals, true)}
                </Table.Row>
            </Table.Body>
        </Table>
    );
}
