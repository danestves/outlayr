import type { PaywallTrigger } from "@/domain/paywall-trigger";

export type TopBlock = "accounts" | "autolog" | "currencies" | "generic" | "installment_apps";

export type AlsoRow = "autolog" | "currencies" | "installments" | "sync";

const ALSO_ROWS = ["autolog", "currencies", "installments", "sync"] as const satisfies readonly AlsoRow[];

const ALSO_ROW_LIMIT = 3;

const METER_SEGMENTS = 12;

export function topBlockOf(trigger: typeof PaywallTrigger.Type, autologUsed: number): TopBlock {
    switch (trigger) {
        case "autolog": {
            return autologUsed > 0 ? "autolog" : "generic";
        }
        case "accounts":
        case "currencies":
        case "installment_apps": {
            return trigger;
        }
        default: {
            return "generic";
        }
    }
}

const COVERED = {
    accounts: null,
    autolog: "autolog",
    currencies: "currencies",
    generic: null,
    installment_apps: "installments",
} as const satisfies Record<TopBlock, AlsoRow | null>;

export function alsoRowsFor(block: TopBlock): AlsoRow[] {
    return ALSO_ROWS.filter((row) => row !== COVERED[block]).slice(0, ALSO_ROW_LIMIT);
}

/** Filled segments are what was logged, tinted ones what is waiting; each side keeps one segment while it has any. */
interface MeterSegments {
    filled: number;
    waiting: number;
}

export function meterSegments(used: number, waiting: number): MeterSegments {
    const total = used + waiting;
    if (total === 0) {
        return { filled: 0, waiting: 0 };
    }
    if (waiting === 0) {
        return { filled: METER_SEGMENTS, waiting: 0 };
    }
    if (used === 0) {
        return { filled: 0, waiting: METER_SEGMENTS };
    }
    const filled = Math.min(METER_SEGMENTS - 1, Math.max(1, Math.round((METER_SEGMENTS * used) / total)));
    return { filled, waiting: METER_SEGMENTS - filled };
}
