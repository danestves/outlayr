export interface MonthCell {
    day: string;
    inMonth: boolean;
}

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
const THURSDAY = 3;
const pad = (value: number) => String(value).padStart(2, "0");
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const noon = (day: string) => new Date(`${day}T12:00:00Z`);

/** `firstWeekday` is the ledger setting: 1 is Sunday, 2 is Monday. Leading blanks are null. */
export function monthGrid(today: string, firstWeekday: number): (MonthCell | null)[] {
    const start = noon(`${today.slice(0, 7)}-01`);
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 12));
    const lead = (start.getUTCDay() - (firstWeekday - 1) + WEEK_DAYS) % WEEK_DAYS;
    const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);
    for (let at = start.getTime(); at < next.getTime(); at += DAY_MS) {
        cells.push({ day: iso(new Date(at)), inMonth: true });
    }
    for (let at = next.getTime(); cells.length % WEEK_DAYS !== 0; at += DAY_MS) {
        cells.push({ day: iso(new Date(at)), inMonth: false });
    }
    return cells;
}

export function weekDays(today: string, firstWeekday: number): string[] {
    const at = noon(today).getTime();
    const back = (noon(today).getUTCDay() - (firstWeekday - 1) + WEEK_DAYS) % WEEK_DAYS;
    return Array.from({ length: WEEK_DAYS }, (_, index) => iso(new Date(at + (index - back) * DAY_MS)));
}

export function isoWeek(day: string): number {
    const date = noon(day);
    const thursday = new Date(date.getTime() + (THURSDAY - ((date.getUTCDay() + WEEK_DAYS - 1) % WEEK_DAYS)) * DAY_MS);
    const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1, 12);
    return Math.floor((thursday.getTime() - yearStart) / DAY_MS / WEEK_DAYS) + 1;
}

/** Weekday order for a header row, as `2023-01-01` based days (a Sunday). */
export function weekdayOrder(firstWeekday: number): string[] {
    return Array.from({ length: WEEK_DAYS }, (_, index) => iso(new Date(Date.UTC(2023, 0, firstWeekday + index, 12))));
}
