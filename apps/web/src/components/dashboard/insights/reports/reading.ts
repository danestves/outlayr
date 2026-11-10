import type { useIntlayer } from "react-intlayer";

import type { Column, Definition, Grouping, Label, Measure, Span } from "./model";

const MONTH_KEY_LENGTH = 7;

const yearOf = (key: string) => key.slice(0, 4);
const crossesYears = (columns: readonly Column[]) =>
    columns.length > 0 && yearOf(columns[0]?.from ?? "") !== yearOf(columns.at(-1)?.to ?? "");

/** The months a report's columns run over. */
export const monthsOf = (columns: readonly Column[], fallback: string): Span => ({
    from: columns[0]?.from.slice(0, MONTH_KEY_LENGTH) ?? fallback,
    to: columns.at(-1)?.to.slice(0, MONTH_KEY_LENGTH) ?? fallback,
});

/** The formats a report needs to be read; the dashboard hands in its fuller set. */
export interface ReadingFormat {
    axis: (value: number) => string;
    date: (day: string) => string;
    month: (key: string) => string;
    whole: (value: number) => string;
}

interface WordsInput<Format extends ReadingFormat> {
    categoryName: (category: { id: string; name: string }) => string;
    copy: ReturnType<typeof useIntlayer<"dashboard-insights-reports">>;
    fmt: Format;
    locale: string;
    uncategorized: string;
}

export function reportWords<Format extends ReadingFormat>({
    categoryName,
    copy,
    fmt,
    locale,
    uncategorized,
}: WordsInput<Format>) {
    const rowName = (label: Label, kind: Definition["rows"]) => {
        switch (label.special) {
            case "uncategorized": {
                return uncategorized;
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
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
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
        rowsBy: (definition: Pick<Definition, "columns" | "rows">) =>
            definition.columns === "none"
                ? copy.dimensions[definition.rows].value
                : copy.rowsBy({
                      columns: copy.groupings[definition.columns].name.value.toLocaleLowerCase(),
                      rows: copy.dimensions[definition.rows].value,
                  }).value,
        title: (definition: Pick<Definition, "columns" | "rows">) =>
            definition.columns === "none"
                ? copy.dimensions[definition.rows].value
                : copy.by({
                      columns: copy.groupings[definition.columns].name.value,
                      rows: copy.dimensions[definition.rows].value.toLocaleLowerCase(),
                  }).value,
    };
}

/** What the chart and the table need, so a report can be read outside the dashboard. */
export type Reading = ReturnType<typeof reportWords<ReadingFormat>>;
