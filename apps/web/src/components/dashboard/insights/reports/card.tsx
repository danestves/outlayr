import type { ReactNode } from "react";

import { Chart, Legend } from "./chart";
import type { Definition, Report } from "./model";
import { Pivot } from "./pivot";
import type { Reading } from "./reading";

const FIGURES_PER_ROW = 2;
const COLUMNS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"] as const;
const RISE_TONES = { average: "flat", count: "flat", income: "good", net: "flat", spending: "poor" } as const;

/** The part of a definition that decides how a report reads, which is all a shared copy keeps. */
export type Arrangement = Pick<Definition, "columns" | "measure" | "rows">;

export interface Figure {
    label: ReactNode;
    value: ReactNode;
}

/** The raised tray every report surface sits in: a header on the tray, the content on a panel set into it. */
export const TRAY = "bg-muted border-border flex min-w-0 flex-col overflow-hidden rounded-3xl border";
export const PANEL = "bg-card border-border rounded-t-2xl border-t";

function Strip({ figures }: { figures: readonly Figure[] }) {
    return (
        <div
            className={`border-border grid grid-cols-2 gap-4 border-b p-4 sm:gap-0 sm:px-5 ${COLUMNS[figures.length] ?? ""}`}
        >
            {figures.map((figure, index) => (
                <div
                    className={`min-w-0 ${index === 0 ? "" : "sm:border-border sm:border-l sm:pl-5"} ${
                        index === FIGURES_PER_ROW || figures.length === FIGURES_PER_ROW ? "max-sm:col-span-2" : ""
                    }`}
                    key={index}
                >
                    <div className="text-muted-foreground text-sm leading-5 font-medium">{figure.label}</div>
                    <div className="dash-figure mt-0.5 flex h-[30px] items-center gap-2 truncate text-[22px] leading-[30px] font-semibold tracking-[-0.04em]">
                        {figure.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface FiguresInput {
    definition: Arrangement;
    empty: boolean;
    report: Report;
    words: Reading;
}

export function riseFigure({ definition, report, words }: Omit<FiguresInput, "empty">): Figure {
    const { copy } = words;
    const [first] = report.columns;
    const last = report.columns.at(-1);
    const columnLabel = (column: typeof first) =>
        column ? words.columnName(definition.columns, column, report.columns) : "";
    return {
        label: report.rise ? copy.kpi.rise({ from: columnLabel(first), to: columnLabel(last) }) : copy.kpi.riseNone,
        value: report.rise ? (
            <span className="flex items-center gap-2">
                {words.rowName(report.rise.label, definition.rows)}
                <span className="dash-trend" data-tone={RISE_TONES[definition.measure]}>
                    {`+${words.measureValue(definition.measure, report.rise.delta)}`}
                </span>
            </span>
        ) : (
            "–"
        ),
    };
}

export function reportFigures({ definition, empty, report, words }: FiguresInput) {
    const { copy } = words;
    const span = report.columns.length;
    const unit = copy.groupings[definition.columns];
    const figures: Figure[] = [
        {
            label:
                definition.columns === "none"
                    ? copy.kpi.totalPlain
                    : copy.kpi.total({ count: String(span), unit: (span === 1 ? unit.one : unit.many).value }),
            value: words.measureValue(definition.measure, report.totals.total),
        },
        ...(definition.columns === "none"
            ? []
            : [{ label: unit.average, value: words.measureValue(definition.measure, report.totals.average) }]),
        empty ? { label: copy.kpi.entries, value: "0" } : riseFigure({ definition, report, words }),
    ].slice(0, 3);
    return figures;
}

interface ReportCardProps {
    averages: boolean;
    definition: Arrangement;
    figures: readonly Figure[];
    /** What stands in for the chart and the table when the report has no entries. */
    noData?: ReactNode;
    report: Report;
    words: Reading;
}

export function ReportCard({ averages, definition, figures, noData, report, words }: ReportCardProps) {
    const { copy } = words;
    const empty = noData !== undefined;
    const chartLabel = copy.chart.label({
        columns: copy.groupings[definition.columns].name.value,
        measure: copy.measures[definition.measure].value,
        rows: copy.dimensions[definition.rows].value,
    }).value;
    return (
        <section className={TRAY}>
            <Strip figures={figures} />
            {empty ? null : (
                <div className="mt-1.5 flex min-h-11 shrink-0 items-center px-4 py-2">
                    <Legend kind={definition.rows} report={report} words={words} />
                </div>
            )}
            <div className={`${PANEL} flex-1`}>
                {empty ? (
                    noData
                ) : (
                    <>
                        <div className="mx-5 mb-4">
                            <Chart
                                grouping={definition.columns}
                                kind={definition.rows}
                                label={chartLabel}
                                report={report}
                                words={words}
                            />
                        </div>
                        <Pivot
                            averages={averages}
                            grouping={definition.columns}
                            kind={definition.rows}
                            report={report}
                            words={words}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
