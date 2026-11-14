import type { SharedReport } from "@outlayr/backend/confect/sharedReports.spec";

export type { SharedReport } from "@outlayr/backend/confect/sharedReports.spec";
export type Measure = SharedReport["measure"];
export type Dimension = SharedReport["rowsBy"];
export type Grouping = SharedReport["grouping"];

export interface Arrangement {
    columns: Grouping;
    measure: Measure;
    rows: Dimension;
}

export interface Span {
    from: string;
    to: string;
}

interface Label {
    color: string | null;
    id: string;
    name: string;
}

export interface Column {
    from: string;
    key: string;
    to: string;
}

export interface ReportRow {
    /** The last column against this row's average, or null when there is nothing to compare. */
    change: number | null;
    label: Label;
    total: number;
    values: number[];
    average: number;
}

export interface Report {
    columns: Column[];
    measure: Measure;
    /** The row with the biggest climb from the first column to the last. */
    rise: { delta: number; label: Label } | null;
    rows: ReportRow[];
    totals: ReportRow;
}

type Figures = SharedReport["totals"];

const rowOf = (figures: Figures, label: Label): ReportRow => ({
    average: figures.average,
    change: figures.change,
    label,
    total: figures.total,
    values: [...figures.values],
});

/** A shared copy back in the shape the chart and the table draw. */
export function reportOf(shared: SharedReport) {
    const definition: Arrangement = { columns: shared.grouping, measure: shared.measure, rows: shared.rowsBy };
    const report: Report = {
        columns: shared.columns.map((column) => ({ ...column })),
        measure: shared.measure,
        rise: shared.rise
            ? { delta: shared.rise.delta, label: { color: shared.rise.color, id: "rise", name: shared.rise.name } }
            : null,
        rows: shared.rows.map((row, index) => rowOf(row, { color: row.color, id: String(index), name: row.name })),
        totals: rowOf(shared.totals, { color: null, id: "total", name: "" }),
    };
    return { definition, report };
}
