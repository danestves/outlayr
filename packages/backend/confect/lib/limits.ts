import { HOUR } from "@convex-dev/rate-limiter";

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

export function perUserBurst(name: keyof typeof BURSTS, pro: boolean) {
    const limit: PerUserBurst = BURSTS[name];
    const { capacity, rate } = (pro ? limit.pro : undefined) ?? limit.base;
    const override = limit.env === undefined ? Number.NaN : Number(process.env[limit.env]);
    return {
        capacity: Number.isInteger(override) && override > 0 ? override : capacity,
        kind: "token bucket",
        period: HOUR,
        rate,
    } as const;
}
