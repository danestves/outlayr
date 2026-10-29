import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { AutologSource } from "@/lib/pending-writes-core";

import { FREE_AUTOLOG_PER_MONTH } from "./pro-limits";

export const AutologAccess = Schema.Literals(["free", "open", "pending"]);

export type AutologAccess = typeof AutologAccess.Type;

interface EntitlementState {
    isConfigured: boolean;
    isPro: boolean;
    isResolved: boolean;
}

export function autologAccessOf(entitlement: EntitlementState, sellable: boolean): AutologAccess {
    if (!sellable || !entitlement.isConfigured || entitlement.isPro) {
        return "open";
    }
    return entitlement.isResolved ? "free" : "pending";
}

const MonthUsage = Schema.Struct({ held: Schema.Boolean, used: Schema.Finite });

const AutologUsage = Schema.Record(Schema.String, MonthUsage);

export type AutologUsage = typeof AutologUsage.Type;

const decodeUsage = Schema.decodeUnknownOption(AutologUsage);

export function parseAutologUsage(raw: string | null | undefined): AutologUsage {
    if (!raw) {
        return {};
    }
    try {
        return Option.getOrElse(decodeUsage(JSON.parse(raw)), () => ({}));
    } catch {
        return {};
    }
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
