import type { SharedReport as SharedReportSchema } from "@outlayr/backend/confect/sharedReports.spec";

import type { Arrangement } from "./card";
import type { Label, Report, ReportRow } from "./model";

export type SharedReport = typeof SharedReportSchema.Type;

const PERCENT = 100;
const TENTHS = 10;

/** Shares of the whole only mean something for a measure that adds up to a positive total. */
export const canHideAmounts = (report: Pick<Report, "measure" | "totals">) =>
    (report.measure === "spending" || report.measure === "income") && report.totals.total > 0;

interface SnapshotInput {
    amounts: boolean;
    currency: string;
    definition: Arrangement;
    name: string;
    report: Report;
    rowName: (label: Label) => string;
}

/**
 * With amounts off every figure leaves the browser as its share of the report's total, so no amount is uploaded.
 * A report with no such whole gives no copy at all: amounts never go out unasked.
 */
export function snapshotOf({
    amounts,
    currency,
    definition,
    name,
    report,
    rowName,
}: SnapshotInput): SharedReport | null {
    if (!(amounts || canHideAmounts(report))) {
        return null;
    }
    const whole = report.totals.total;
    const shown = (value: number) => (amounts ? value : Math.round((value / whole) * PERCENT * TENTHS) / TENTHS);
    const figures = (row: ReportRow) => ({
        average: shown(row.average),
        change: row.change,
        total: shown(row.total),
        values: row.values.map(shown),
    });
    return {
        columns: report.columns.map(({ from, key, to }) => ({ from, key, to })),
        currency,
        grouping: definition.columns,
        measure: definition.measure,
        name,
        rise: report.rise
            ? { color: report.rise.label.color, delta: shown(report.rise.delta), name: rowName(report.rise.label) }
            : null,
        rows: report.rows.map((row) => ({ ...figures(row), color: row.label.color, name: rowName(row.label) })),
        rowsBy: definition.rows,
        totals: figures(report.totals),
        unit: amounts ? "amount" : "percent",
    };
}

const labelOf = (id: string, name: string, color: string | null): Label => ({ color, id, name, special: null });

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
        entries: shared.rows.length,
        measure: shared.measure,
        rise: shared.rise
            ? { delta: shared.rise.delta, label: labelOf("rise", shared.rise.name, shared.rise.color) }
            : null,
        rows: shared.rows.map((row, index) => rowOf(row, labelOf(String(index), row.name, row.color))),
        sources: [],
        totals: rowOf(shared.totals, labelOf("total", "", null)),
    };
    return { definition, report };
}
