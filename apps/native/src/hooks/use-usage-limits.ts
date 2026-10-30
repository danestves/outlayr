import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { projectLimit } from "@/domain/usage-limits";
import type { LimitBucket, UsageLimits } from "@/domain/usage-limits";
import { posthog } from "@/lib/posthog";
import { readSecondClock, subscribeSecondClock } from "@/lib/second-clock";

const subscribeNever = () => () => undefined;
const USAGE_LIMITS_REQUEST = { limits: { args: {}, query: api.limits.mine } };
const LAST_NOTICE_MS = 6000;

export type CaptureFeature = "receiptScan" | "voiceEntry";
export type LimitRefusal = "notEntitled" | "quotaExceeded" | "rateLimited";

interface CapturesNotice {
    capacity: number;
    resetsAt: number | null;
}

interface BurstNotice {
    nextAt: number | null;
}

export type LimitNotice =
    | (CapturesNotice & { kind: "capturesEmpty" })
    | (CapturesNotice & { kind: "capturesLast" })
    | (BurstNotice & { kind: "last" })
    | (BurstNotice & { kind: "paused" });

export function useUsageLimits(): UsageLimits | null | undefined {
    const result: UsageLimits | null | Error | undefined = useQueries(USAGE_LIMITS_REQUEST).limits;
    return result instanceof Error ? undefined : result;
}

export function useTickingNow(active: boolean): number {
    const [mountedAt] = useState(Date.now);
    const ticked = useSyncExternalStore(active ? subscribeSecondClock : subscribeNever, readSecondClock);
    return active ? Math.max(ticked, mountedAt) : mountedAt;
}

export function isLimitRefusal(reason: string): reason is LimitRefusal {
    return reason === "notEntitled" || reason === "quotaExceeded" || reason === "rateLimited";
}

export function trackCapturesWall(reason: string): void {
    if (reason === "notEntitled" || reason === "quotaExceeded") {
        posthog?.capture("limit_hit", { limit: "captures" });
    }
}

function atWrite(bucket: LimitBucket) {
    return projectLimit(bucket, bucket.ts);
}

function spentLast(before: LimitBucket, after: LimitBucket): boolean {
    return after.value < 1 && projectLimit(before, after.ts).left >= 1;
}

function lastNotice(feature: CaptureFeature, before: UsageLimits, after: UsageLimits): LimitNotice | null {
    if (spentLast(before.captures, after.captures)) {
        return { capacity: after.captures.capacity, kind: "capturesLast", resetsAt: atWrite(after.captures).nextAt };
    }
    if (spentLast(before[feature], after[feature])) {
        return { kind: "last", nextAt: atWrite(after[feature]).nextAt };
    }
    return null;
}

export function useLimitNotice(feature: CaptureFeature, refusal: LimitRefusal | null) {
    const limits = useUsageLimits();
    const [seen, setSeen] = useState(limits);
    const [last, setLast] = useState<LimitNotice | null>(null);

    if (limits !== seen) {
        setSeen(limits);
        const notice = seen && limits ? lastNotice(feature, seen, limits) : null;
        if (notice !== null) {
            setLast(notice);
        }
    }

    // oxlint-disable-next-line outlayr/react-effect-budget -- arms the timer that retires the last-capture notice after its display window
    useEffect(() => {
        if (last === null) {
            return;
        }
        const timer = setTimeout(() => setLast(null), LAST_NOTICE_MS);
        return () => clearTimeout(timer);
    }, [last]);

    let refused: LimitNotice | null = null;
    if (refusal === "rateLimited") {
        refused = { kind: "paused", nextAt: limits ? atWrite(limits[feature]).nextAt : null };
    } else if (refusal !== null && limits) {
        refused = {
            capacity: limits.captures.capacity,
            kind: "capturesEmpty",
            resetsAt: atWrite(limits.captures).nextAt,
        };
    }

    const candidate = refused ?? last;
    const now = useTickingNow(candidate !== null);
    const expired = candidate !== null && "nextAt" in candidate && candidate.nextAt !== null && candidate.nextAt <= now;

    return { notice: expired ? null : candidate, now, pro: limits?.pro ?? false };
}
