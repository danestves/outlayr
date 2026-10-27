import { HOUR } from "@convex-dev/rate-limiter";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { numberOverride } from "./config";

interface Burst {
    capacity: number;
    rate: number;
}

interface PerUserBurst {
    base: Burst;
    env?: string;
    pro?: Burst;
}

const BURSTS = {
    csvImport: { base: { capacity: 10, rate: 30 }, env: "CSV_IMPORT_CAPACITY" },
    enrichment: { base: { capacity: 30, rate: 120 } },
    enrichmentBackground: { base: { capacity: 6, rate: 30 } },
    enrichmentQueue: { base: { capacity: 60, rate: 240 } },
    receiptScan: { base: { capacity: 10, rate: 30 }, env: "RECEIPT_SCAN_CAPACITY", pro: { capacity: 50, rate: 200 } },
    voiceEntry: { base: { capacity: 10, rate: 40 }, env: "VOICE_ENTRY_CAPACITY", pro: { capacity: 60, rate: 240 } },
    voiceThread: { base: { capacity: 10, rate: 20 }, pro: { capacity: 30, rate: 60 } },
} satisfies Record<string, PerUserBurst>;

type FixedBurstName = {
    [Name in keyof typeof BURSTS]: (typeof BURSTS)[Name] extends { env: string } ? never : Name;
}[keyof typeof BURSTS];

function burstOf(limit: PerUserBurst, pro: boolean, capacityOverride: number | undefined) {
    const { capacity, rate } = (pro ? limit.pro : undefined) ?? limit.base;
    return { capacity: capacityOverride ?? capacity, kind: "token bucket", period: HOUR, rate } as const;
}

export function fixedBurst(name: FixedBurstName, pro: boolean) {
    return burstOf(BURSTS[name], pro, undefined);
}

export const perUserBurst = Effect.fn("Limits.perUserBurst")(function* perUserBurst(
    name: keyof typeof BURSTS,
    pro: boolean
) {
    const limit: PerUserBurst = BURSTS[name];
    const override = limit.env === undefined ? Option.none() : yield* numberOverride(limit.env);
    const capacity = Option.getOrUndefined(override);
    return burstOf(
        limit,
        pro,
        capacity !== undefined && Number.isInteger(capacity) && capacity > 0 ? capacity : undefined
    );
});
