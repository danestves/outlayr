import type { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type UsageLimits = NonNullable<FunctionReturnType<typeof api.limits.mine>>;

export type LimitBucket = UsageLimits["captures"];

export interface LimitProjection {
    capacity: number;
    fullAt: number | null;
    left: number;
    nextAt: number | null;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

export function projectLimit(bucket: LimitBucket, now: number): LimitProjection {
    const { capacity, period, rate, ts, value } = bucket;
    if (bucket.kind === "token bucket") {
        const perMs = rate / period;
        const current = Math.min(value + Math.max(0, now - ts) * perMs, capacity);
        return {
            capacity,
            fullAt: current >= capacity ? null : now + (capacity - current) / perMs,
            left: Math.floor(current),
            nextAt: current >= 1 ? null : now + (1 - current) / perMs,
        };
    }
    const windows = Math.max(0, Math.floor((now - ts) / period));
    const current = windows > 0 ? Math.min(value + rate * windows, capacity) : value;
    const start = ts + windows * period;
    return {
        capacity,
        fullAt: current >= capacity ? null : start + Math.ceil((capacity - current) / rate) * period,
        left: Math.floor(current),
        nextAt: current >= 1 ? null : start + period,
    };
}

export function formatWait(ms: number): string {
    if (ms < MINUTE_MS) {
        return `${Math.max(1, Math.ceil(ms / SECOND_MS))} s`;
    }
    if (ms < HOUR_MS) {
        return `${Math.ceil(ms / MINUTE_MS)} min`;
    }
    return `${Math.ceil(ms / HOUR_MS)} h`;
}
