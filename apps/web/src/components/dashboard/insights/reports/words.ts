import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";

import { useInsightsFormat } from "../format";
import type { Column, Definition, Grouping, Label, Measure, Span } from "./model";

const yearOf = (key: string) => key.slice(0, 4);

/** Every phrase a report is read in, built once from the ledger's formats and the page's copy. */
export function useReportWords() {
    const copy = useIntlayer("dashboard-insights-reports");
    const categoryName = useCategoryName();
    const { ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    return useMemo(() => {
        const rowName = (label: Label, kind: Definition["rows"]) => {
            switch (label.special) {
                case "uncategorized": {
                    return categoryName({ id: UNCATEGORIZED_ID, name: "" });
                }
                case null: {
                    return kind === "category" || kind === "subcategory"
                        ? categoryName({ id: label.id, name: label.name })
                        : label.name;
                }
                default: {
                    return copy.specials[label.special].value;
                }
            }
        };
        const monthYear = (key: string) => `${fmt.month(key)} ${yearOf(key)}`;
        const crossesYears = (columns: readonly Column[]) =>
            columns.length > 0 && yearOf(columns[0]?.from ?? "") !== yearOf(columns.at(-1)?.to ?? "");
        const columnName = (grouping: Grouping, column: Column, columns: readonly Column[]) => {
            const suffix = crossesYears(columns) ? ` ${yearOf(column.from).slice(2)}` : "";
            switch (grouping) {
                case "month": {
                    return `${fmt.month(column.key)}${suffix}`;
                }
                case "week": {
                    return fmt.date(column.from);
                }
                case "quarter": {
                    return `${column.key.split("-")[1]}${suffix}`;
                }
                case "year": {
                    return column.key;
                }
                default: {
                    return copy.table.total.value;
                }
            }
        };
        const rangeName = ({ from, to }: Span) => {
            if (from === to) {
                return monthYear(from);
            }
            if (from.endsWith("-01") && to.endsWith("-12") && yearOf(from) === yearOf(to)) {
                return yearOf(from);
            }
            return yearOf(from) === yearOf(to)
                ? `${copy.range.until({ from: fmt.month(from), to: fmt.month(to) }).value} ${yearOf(to)}`
                : copy.range.until({ from: monthYear(from), to: monthYear(to) }).value;
        };
        const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
        const measureValue = (measure: Measure, value: number) =>
            measure === "count" ? number.format(value) : fmt.whole(value);
        return {
            columnName,
            copy,
            crossesYears,
            fmt,
            measureValue,
            rangeName,
            rowName,
            rowsBy: (definition: Definition) =>
                definition.columns === "none"
                    ? copy.dimensions[definition.rows].value
                    : copy.rowsBy({
                          columns: copy.groupings[definition.columns].name.value.toLocaleLowerCase(),
                          rows: copy.dimensions[definition.rows].value,
                      }).value,
            title: (definition: Definition) =>
                definition.columns === "none"
                    ? copy.dimensions[definition.rows].value
                    : copy.by({
                          columns: copy.groupings[definition.columns].name.value,
                          rows: copy.dimensions[definition.rows].value.toLocaleLowerCase(),
                      }).value,
        };
    }, [categoryName, copy, fmt]);
}

export type ReportWords = ReturnType<typeof useReportWords>;
