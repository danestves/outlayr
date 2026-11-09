export const DAY_MS = 86_400_000;
const FARTHEST_WEST_MS = 10 * 3_600_000;
const LATEST_PAYDAY = 28;

export type OffsetAt = (instant: number) => number;

export const fixedOffset =
    (offsetMs: number): OffsetAt =>
    () =>
        offsetMs;

const OFFSET_BUCKET_MS = DAY_MS;
const CACHED_RANGE_MS = 8_000_000_000_000_000;

export function zoneOffsets(timeZone: string): OffsetAt | null {
    let format: Intl.DateTimeFormat;
    try {
        format = new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            hour: "numeric",
            hourCycle: "h23",
            minute: "numeric",
            month: "numeric",
            second: "numeric",
            timeZone,
            year: "numeric",
        });
    } catch {
        return null;
    }
    const exact = (instant: number) => {
        const parts = new Map(format.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.get(type) ?? 0;
        const wallMs = Date.UTC(
            part("year"),
            part("month") - 1,
            part("day"),
            part("hour"),
            part("minute"),
            part("second")
        );
        return wallMs - Math.floor(instant / 1000) * 1000;
    };
    const steady = new Map<number, number | null>();
    return (instant) => {
        if (!(Math.abs(instant) <= CACHED_RANGE_MS)) {
            return exact(instant);
        }
        const bucket = Math.floor(instant / OFFSET_BUCKET_MS);
        let offset = steady.get(bucket);
        if (offset === undefined) {
            const first = exact(bucket * OFFSET_BUCKET_MS);
            offset = first === exact((bucket + 1) * OFFSET_BUCKET_MS - 1) ? first : null;
            steady.set(bucket, offset);
        }
        return offset ?? exact(instant);
    };
}

export const fromWall = (wallMs: number, offsetAt: OffsetAt) => wallMs - offsetAt(wallMs - offsetAt(wallMs));

export function utcOffsetOf(calendarDay: number, hintMs?: number): number {
    const sinceUtcMidnight = ((calendarDay % DAY_MS) + DAY_MS) % DAY_MS;
    const west = 0 - sinceUtcMidnight;
    const east = DAY_MS - sinceUtcMidnight;
    if (hintMs === west || hintMs === east) {
        return hintMs;
    }
    return sinceUtcMidnight <= FARTHEST_WEST_MS ? west : east;
}

export function monthWindow(nowMs: number, offsetMs: number, firstDayOfMonth: number, monthsAgo: number) {
    const local = new Date(nowMs + offsetMs);
    const anchor = Math.min(Math.max(1, firstDayOfMonth), LATEST_PAYDAY);
    const month = local.getUTCMonth() - monthsAgo - (local.getUTCDate() < anchor ? 1 : 0);
    return {
        end: Date.UTC(local.getUTCFullYear(), month + 1, anchor) - offsetMs,
        start: Date.UTC(local.getUTCFullYear(), month, anchor) - offsetMs,
    };
}

// ponytail: monthWindow takes the offset at now, so a month across a DST change is cut an hour off; use offsetAt.
export const wall = (instant: number, offsetMs: number) => new Date(instant + offsetMs);
export const wallDay = (date: Date) => date.toISOString().slice(0, 10);
export const isoDay = (instant: number, offsetMs: number) => wallDay(wall(instant, offsetMs));
export const wallMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const wallNoon = (day: string) => Date.parse(`${day}T12:00:00Z`);

export const utcDayStart = (instant: number) => Math.floor(instant / DAY_MS) * DAY_MS;

export function filedOn(instant: number, offsetAt: OffsetAt) {
    const local = new Date(instant + offsetAt(instant));
    return {
        day: fromWall(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()), offsetAt),
        month: fromWall(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1), offsetAt),
    };
}
