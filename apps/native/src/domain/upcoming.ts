export interface MonthGroup<T> {
    month: Date;
    rows: T[];
}

export function groupByMonth<T>(rows: readonly T[], dateOf: (row: T) => Date): MonthGroup<T>[] {
    const groups: MonthGroup<T>[] = [];
    for (const row of rows) {
        const date = dateOf(row);
        const last = groups.at(-1);
        if (last?.month.getFullYear() === date.getFullYear() && last.month.getMonth() === date.getMonth()) {
            last.rows.push(row);
        } else {
            groups.push({ month: new Date(date.getFullYear(), date.getMonth(), 1), rows: [row] });
        }
    }
    return groups;
}
