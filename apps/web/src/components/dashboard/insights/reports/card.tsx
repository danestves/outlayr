import type { ReactNode } from "react";

import { Chart, Legend } from "./chart";
import { NoData } from "./empty";
import type { Definition, Report } from "./model";
import { Pivot } from "./pivot";
import type { ReportWords } from "./words";

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
            className="border-border grid border-b px-5 py-4"
            style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}
        >
            {figures.map((figure, index) => (
                <div className={index === 0 ? "min-w-0" : "border-border min-w-0 border-l pl-5"} key={index}>
                    <div className="text-muted-foreground text-sm leading-5 font-medium">{figure.label}</div>
                    <div className="dash-figure mt-0.5 flex h-[30px] items-center gap-2 truncate text-[22px] leading-[30px] font-semibold tracking-[-0.04em]">
                        {figure.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface ReportCardProps {
    averages: boolean;
    definition: Definition;
    empty: boolean;
    figures: readonly Figure[];
    noDataBody: string;
    onClear: () => void;
    report: Report;
    words: ReportWords;
}

export function ReportCard({
    averages,
    definition,
    empty,
    figures,
    noDataBody,
    onClear,
    report,
    words,
}: ReportCardProps) {
    const { copy } = words;
    const names = report.columns.map((column) => words.columnName(definition.columns, column, report.columns));
    const chartLabel = copy.chart.label({
        columns: copy.groupings[definition.columns].name.value,
        measure: copy.measures[definition.measure].value,
        rows: copy.dimensions[definition.rows].value,
    }).value;
    return (
        <section className={TRAY}>
            <Strip figures={figures} />
            {empty ? null : (
                <div className="mt-1.5 flex h-11 shrink-0 items-center px-4">
                    <Legend kind={definition.rows} report={report} words={words} />
                </div>
            )}
            <div className={`${PANEL} flex-1`}>
                {empty ? (
                    <NoData
                        body={noDataBody}
                        columns={[
                            ...names,
                            ...(averages && definition.columns !== "none" ? [copy.table.average.value] : []),
                        ]}
                        corner={copy.dimensions[definition.rows].value}
                        onClear={onClear}
                        words={words}
                    />
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
