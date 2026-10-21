import type { TranslatableKey } from "@/i18n/catalog";

export interface SyncPresentation {
    detail: TranslatableKey;
    title: TranslatableKey;
}

export interface SyncLabel {
    count?: number;
    key:
        | "settings.sync.upToDate"
        | "settings.sync.never"
        | "settings.sync.pending"
        | "settings.sync.pendingOne"
        | "settings.sync.paused"
        | "settings.sync.off";
}

export interface SyncLabelProbe {
    enabled: boolean;
    paused: boolean;
    pending: number;
    syncedAt: Date | null;
}

export type EffectiveCapabilityStatus =
    | { kind: "local" }
    | { kind: "unavailable" }
    | { kind: "accountRequired" }
    | { enableSync: true; kind: "syncOff" }
    | { kind: "active"; pending: number; syncedAt: Date | null };

export interface CapabilityStatusProbe {
    accountId: string | null;
    cloud: "configured" | "misconfigured" | "unconfigured";
    local: boolean;
    pending: number;
    syncEnabled: boolean;
    syncedAt: Date | null;
}

export function effectiveCapabilityStatus(probe: CapabilityStatusProbe): EffectiveCapabilityStatus {
    if (probe.local) {
        return { kind: "local" };
    }
    if (probe.cloud !== "configured") {
        return { kind: "unavailable" };
    }
    if (probe.accountId === null) {
        return { kind: "accountRequired" };
    }
    if (!probe.syncEnabled) {
        return { enableSync: true, kind: "syncOff" };
    }
    return { kind: "active", pending: probe.pending, syncedAt: probe.syncedAt };
}

// The pending count is the only failure signal, by design: see §8.7 of `docs/internals/convex-sync.md`.
export function syncStatusLabel({ enabled, paused, pending, syncedAt }: SyncLabelProbe): SyncLabel {
    // Turning sync off DELETES the outbox, so `pending` reads 0 the moment the switch moves.
    if (!enabled) {
        return { key: "settings.sync.off" };
    }
    if (paused) {
        return { key: "settings.sync.paused" };
    }
    if (pending === 1) {
        return { key: "settings.sync.pendingOne" };
    }
    if (pending > 1) {
        return { count: pending, key: "settings.sync.pending" };
    }
    return syncedAt === null ? { key: "settings.sync.never" } : { key: "settings.sync.upToDate" };
}

// A lapsed Pro pauses here instead of rewriting the stored switch. Keyed on a CONFIRMED entitlement: the server
// refuses an unproven customer, so a build that cannot reach RevenueCat pauses too.
export function syncRunnable(syncEnabled: boolean, proEntitled: boolean): boolean {
    return syncEnabled && proEntitled;
}

// Not the inverse of `syncRunnable`: a switch the user never turned on is off, not paused.
export function syncPaused(syncEnabled: boolean, proEntitled: boolean): boolean {
    return syncEnabled && !proEntitled;
}

export function syncPresentation(
    kind: EffectiveCapabilityStatus["kind"],
    syncEnabled: boolean,
    proEntitled: boolean
): SyncPresentation {
    if (kind === "unavailable") {
        return { detail: "settings.account.unavailableDetail", title: "settings.account.unavailable" };
    }
    if (kind === "accountRequired") {
        return { detail: "settings.sync.needsAccount", title: "settings.account.notSignedIn" };
    }
    if (syncPaused(syncEnabled, proEntitled)) {
        return { detail: "settings.sync.pausedDetail", title: "settings.sync.paused" };
    }
    return syncEnabled
        ? { detail: "settings.sync.onDetail", title: "settings.sync.on" }
        : { detail: "settings.sync.offDetail", title: "settings.sync.off" };
}

export function ownsSyncSwitch(kind: EffectiveCapabilityStatus["kind"], adoptionStatus: string): boolean {
    return adoptionStatus === "settled" && (kind === "active" || kind === "syncOff");
}
