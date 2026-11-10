const DAYS_IN_WEEK = 7;

export interface GridCell {
    day: number | null;
    key: string;
}

export function daysLeftInMonth(today: Date): number {
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
}

export function monthGrid(today: Date, firstWeekdayFromSunday: number) {
    const year = today.getFullYear();
    const month = today.getMonth();
    const length = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const lead = (firstDay - (firstWeekdayFromSunday - 1) + DAYS_IN_WEEK) % DAYS_IN_WEEK;
    const trail = (DAYS_IN_WEEK - ((lead + length) % DAYS_IN_WEEK)) % DAYS_IN_WEEK;
    const cells: GridCell[] = [
        ...Array.from({ length: lead }, (_, index) => ({ day: null, key: `lead-${index}` })),
        ...Array.from({ length }, (_, index) => ({ day: index + 1, key: String(index + 1) })),
        ...Array.from({ length: trail }, (_, index) => ({ day: null, key: `trail-${index}` })),
    ];
    const weeks = Array.from({ length: cells.length / DAYS_IN_WEEK }, (_, row) =>
        cells.slice(row * DAYS_IN_WEEK, (row + 1) * DAYS_IN_WEEK)
    );
    const weekdays = Array.from({ length: DAYS_IN_WEEK }, (_, index) => new Date(year, month, 1 - lead + index));
    return { weekdays, weeks };
}
