export function monthStartMs(at: number): number {
    const date = new Date(at);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export const MAX_MONTH_ROWS = 10_000;
