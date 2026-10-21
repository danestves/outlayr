import { describe, expect, it } from "@jest/globals";

import {
    effectiveCapabilityStatus,
    ownsSyncSwitch,
    syncPaused,
    syncPresentation,
    syncRunnable,
    syncStatusLabel,
} from "./sync-status";

const AT = new Date(1_700_000_000_000);

describe("syncStatusLabel", () => {
    it("reads an empty queue as up to date, not as zero pending", () => {
        expect(syncStatusLabel({ enabled: true, paused: false, pending: 0, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.upToDate",
        });
    });

    it("does not claim up to date on a device that has never synced", () => {
        expect(syncStatusLabel({ enabled: true, paused: false, pending: 0, syncedAt: null })).toStrictEqual({
            key: "settings.sync.never",
        });
    });

    it("counts a single pending row without pluralising it", () => {
        expect(syncStatusLabel({ enabled: true, paused: false, pending: 1, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.pendingOne",
        });
    });

    it("carries the count once there is more than one", () => {
        expect(syncStatusLabel({ enabled: true, paused: false, pending: 7, syncedAt: AT })).toStrictEqual({
            count: 7,
            key: "settings.sync.pending",
        });
    });

    it("reports pending work even before a first successful cycle", () => {
        expect(syncStatusLabel({ enabled: true, paused: false, pending: 3, syncedAt: null })).toStrictEqual({
            count: 3,
            key: "settings.sync.pending",
        });
    });

    it("never dates an idle queue as up to date while replication is paused", () => {
        expect(syncStatusLabel({ enabled: true, paused: true, pending: 0, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.paused",
        });
    });

    it("says so when the switch is off, however recent the last cycle was", () => {
        expect(syncStatusLabel({ enabled: false, paused: false, pending: 0, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.off",
        });
    });

    it("prefers the switch over a paused entitlement, which cannot pause a stopped engine", () => {
        expect(syncStatusLabel({ enabled: false, paused: true, pending: 0, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.off",
        });
    });

    it("reports a paused engine rather than the work it is not doing", () => {
        expect(syncStatusLabel({ enabled: true, paused: true, pending: 4, syncedAt: AT })).toStrictEqual({
            key: "settings.sync.paused",
        });
    });
});

describe("effective capability status", () => {
    it("unconfigured-sync-adoption-photo-status-is-unavailable-without-account", () => {
        expect(
            effectiveCapabilityStatus({
                accountId: null,
                cloud: "unconfigured",
                local: false,
                pending: 9,
                syncEnabled: true,
                syncedAt: AT,
            })
        ).toStrictEqual({ kind: "unavailable" });
    });

    it("keeps remote capabilities account-required until sign-in", () => {
        expect(
            effectiveCapabilityStatus({
                accountId: null,
                cloud: "configured",
                local: false,
                pending: 0,
                syncEnabled: false,
                syncedAt: null,
            })
        ).toStrictEqual({ kind: "accountRequired" });
    });

    it("same-account-sync-off-offers-enable", () => {
        expect(
            effectiveCapabilityStatus({
                accountId: "account-a",
                cloud: "configured",
                local: false,
                pending: 7,
                syncEnabled: false,
                syncedAt: AT,
            })
        ).toStrictEqual({ enableSync: true, kind: "syncOff" });
    });
});

describe("syncPresentation", () => {
    it("names the build as unavailable before it names the account", () => {
        expect(syncPresentation("unavailable", false, false)).toStrictEqual({
            detail: "settings.account.unavailableDetail",
            title: "settings.account.unavailable",
        });
    });

    it("asks for an account without claiming sync is off", () => {
        expect(syncPresentation("accountRequired", false, false)).toStrictEqual({
            detail: "settings.sync.needsAccount",
            title: "settings.account.notSignedIn",
        });
    });

    it("reads the switch only once the capability settled", () => {
        expect(syncPresentation("syncOff", false, true).title).toBe("settings.sync.off");
        expect(syncPresentation("active", true, true).title).toBe("settings.sync.on");
    });

    it("ignores the switch position for a kind that has no switch", () => {
        expect(syncPresentation("unavailable", true, false).title).toBe("settings.account.unavailable");
        expect(syncPresentation("accountRequired", true, false).title).toBe("settings.account.notSignedIn");
    });

    it("reads a switch left on without a confirmed entitlement as paused rather than off", () => {
        expect(syncPresentation("syncOff", true, false)).toStrictEqual({
            detail: "settings.sync.pausedDetail",
            title: "settings.sync.paused",
        });
    });

    it("never calls a switch the user turned off paused", () => {
        expect(syncPresentation("syncOff", false, false).title).toBe("settings.sync.off");
    });
});

describe("syncRunnable", () => {
    it("holds replication down while the entitlement is unproven", () => {
        expect(syncRunnable(true, false)).toBe(false);
    });

    it("runs for a confirmed customer who turned the switch on", () => {
        expect(syncRunnable(true, true)).toBe(true);
    });

    it("stays off for a confirmed customer who never turned it on", () => {
        expect(syncRunnable(false, true)).toBe(false);
    });
});

describe("syncPaused", () => {
    it("pauses replication the user asked for and the entitlement withholds", () => {
        expect(syncPaused(true, false)).toBe(true);
    });

    it("does not call an off switch paused, whatever the entitlement", () => {
        expect(syncPaused(false, false)).toBe(false);
        expect(syncPaused(false, true)).toBe(false);
    });

    it("does not pause a confirmed customer", () => {
        expect(syncPaused(true, true)).toBe(false);
    });
});

describe("ownsSyncSwitch", () => {
    it("withholds the switch until adoption settles", () => {
        expect(ownsSyncSwitch("active", "reconciling")).toBe(false);
        expect(ownsSyncSwitch("syncOff", "reconciling")).toBe(false);
    });

    it("offers the switch for both settled capabilities", () => {
        expect(ownsSyncSwitch("active", "settled")).toBe(true);
        expect(ownsSyncSwitch("syncOff", "settled")).toBe(true);
    });

    it("withholds the switch from a device with no account or no cloud", () => {
        expect(ownsSyncSwitch("accountRequired", "settled")).toBe(false);
        expect(ownsSyncSwitch("unavailable", "settled")).toBe(false);
    });
});
