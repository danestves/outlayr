import type { AutologSource } from "@/lib/pending-writes-core";
import type { Entitlement } from "@/lib/revenuecat-service";

import type { AutologAccess, AutologUsage } from "./meta-values";
import { FREE_AUTOLOG_PER_MONTH } from "./pro-limits";

export function autologAccessOf(entitlement: Entitlement, sellable: boolean): AutologAccess {
    if (!sellable || entitlement.kind === "unconfigured" || entitlement.kind === "pro") {
        return "open";
    }
    return entitlement.kind === "free" ? "free" : "pending";
}

export function autologMonthKey(at: number): string {
    const day = new Date(at);
    return `${day.getFullYear()}-${day.getMonth() + 1}`;
}

export function monthUsage(usage: AutologUsage, at: number) {
    return usage[autologMonthKey(at)] ?? { held: false, used: 0 };
}

export function countsAsAutolog(source: AutologSource): boolean {
    return source === "wallet" || source === "notification";
}

export function autologExpenseCount(source: AutologSource, income: boolean): number {
    return countsAsAutolog(source) && !income ? 1 : 0;
}

export function holdsAutolog(usage: AutologUsage, access: AutologAccess, source: AutologSource, at: number): boolean {
    return access === "free" && countsAsAutolog(source) && monthUsage(usage, at).used >= FREE_AUTOLOG_PER_MONTH;
}

export function withAutologEntry(usage: AutologUsage, at: number, outcome: "applied" | "held"): AutologUsage {
    const key = autologMonthKey(at);
    const month = monthUsage(usage, at);
    return {
        ...usage,
        [key]: outcome === "applied" ? { ...month, used: month.used + 1 } : { ...month, held: true },
    };
}
