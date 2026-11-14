import type { useIntlayer } from "react-intlayer";

import type { Arrangement, Column, Grouping, Measure, Span } from "./model";

const MONTH_KEY_LENGTH = 7;

const yearOf = (key: string) => key.slice(0, 4);
const crossesYears = (columns: readonly Column[]) =>
    columns.length > 0 && yearOf(columns[0]?.from ?? "") !== yearOf(columns.at(-1)?.to ?? "");

/** The months a report's columns run over. */
export const monthsOf = (columns: readonly Column[], fallback: string): Span => ({
    from: columns[0]?.from.slice(0, MONTH_KEY_LENGTH) ?? fallback,
    to: columns.at(-1)?.to.slice(0, MONTH_KEY_LENGTH) ?? fallback,
});

interface ReadingFormat {
    axis: (value: number) => string;
    date: (day: string) => string;
    month: (key: string) => string;
    whole: (value: number) => string;
}

interface WordsInput {
    copy: ReturnType<typeof useIntlayer<"shared-report">>["report"];
    fmt: ReadingFormat;
    locale: string;
}

export function reportWords({ copy, fmt, locale }: WordsInput) {
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
        fmt,
        measureValue,
        rangeName,
        rowsBy: (definition: Pick<Arrangement, "columns" | "rows">) =>
            definition.columns === "none"
                ? copy.dimensions[definition.rows].value
                : copy.rowsBy({
                      columns: copy.groupings[definition.columns].name.value.toLocaleLowerCase(),
                      rows: copy.dimensions[definition.rows].value,
                  }).value,
    };
}

export type Reading = ReturnType<typeof reportWords>;
