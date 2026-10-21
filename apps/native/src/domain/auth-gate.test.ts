import { describe, expect, it } from "@jest/globals";

import { authGate, authRoute, rootStackGroup } from "./auth-gate";
import type { AuthGate } from "./auth-gate";

describe("auth gate", () => {
    it("opens on a cached session the client is still revalidating", () => {
        expect(
            authGate({
                configured: true,
                hasSession: true,
                restoreExpired: false,
                restoring: true,
            })
        ).toBe("signed-in");
    });

    it("opens on a cached session whose revalidation never answered", () => {
        expect(
            authGate({
                configured: true,
                hasSession: true,
                restoreExpired: true,
                restoring: true,
            })
        ).toBe("signed-in");
    });

    it("holds while a session that is not cached is still being read", () => {
        expect(
            authGate({
                configured: true,
                hasSession: false,
                restoreExpired: false,
                restoring: true,
            })
        ).toBe("restoring");
    });

    it("falls through to sign-in once the restore budget is spent", () => {
        expect(
            authGate({
                configured: true,
                hasSession: false,
                restoreExpired: true,
                restoring: true,
            })
        ).toBe("signed-out");
    });

    it("asks for a sign-in once the client answers with nothing", () => {
        expect(
            authGate({
                configured: true,
                hasSession: false,
                restoreExpired: false,
                restoring: false,
            })
        ).toBe("signed-out");
    });

    it("reports a build that cannot sign anyone in rather than opening", () => {
        expect(
            authGate({
                configured: false,
                hasSession: false,
                restoreExpired: false,
                restoring: false,
            })
        ).toBe("unconfigured");
        expect(
            authGate({
                configured: false,
                hasSession: false,
                restoreExpired: false,
                restoring: true,
            })
        ).toBe("unconfigured");
    });
});

describe("account routing", () => {
    const at = (gate: Parameters<typeof authRoute>[0]["gate"], reconciled: boolean, deferred = false) =>
        authRoute({ deferred, gate, reconciled });

    it("opens the ledger of a build that cannot sign anyone in", () => {
        expect(at("unconfigured", true)).toBe("ledger");
        expect(at("unconfigured", false)).toBe("ledger");
    });

    it("opens the ledger for an account whose ledger has been reconciled", () => {
        expect(at("signed-in", true)).toBe("ledger");
    });

    it("reconciles an account's ledger before opening it", () => {
        expect(at("signed-in", false)).toBe("adopt");
    });

    it("asks a signed-out device to sign in", () => {
        expect(at("signed-out", true)).toBe("sign-in");
        expect(at("signed-out", false)).toBe("sign-in");
    });

    it("parks a restore on the sign-in screen, which the cover hides", () => {
        expect(at("restoring", true)).toBe("sign-in");
        expect(at("restoring", false)).toBe("sign-in");
    });

    it("opens the ledger of a device that declined the account offer", () => {
        expect(at("signed-out", false, true)).toBe("ledger");
        expect(at("restoring", false, true)).toBe("ledger");
    });

    it("still reconciles when a device that declined signs in later", () => {
        expect(at("signed-in", false, true)).toBe("adopt");
        expect(at("signed-in", true, true)).toBe("ledger");
    });
});

describe("rootStackGroup", () => {
    const GATES: AuthGate[] = ["restoring", "signed-in", "signed-out", "unconfigured"];
    const BOOLEANS = [true, false];

    it("routes to onboarding whenever the device has not onboarded, regardless of gate", () => {
        for (const gate of GATES) {
            for (const reconciled of BOOLEANS) {
                for (const deferred of BOOLEANS) {
                    expect(rootStackGroup({ deferred, gate, onboarded: false, reconciled })).toBe("onboarding");
                }
            }
        }
    });

    it("delegates to authRoute once onboarded", () => {
        for (const gate of GATES) {
            for (const reconciled of BOOLEANS) {
                for (const deferred of BOOLEANS) {
                    expect(rootStackGroup({ deferred, gate, onboarded: true, reconciled })).toBe(
                        authRoute({ deferred, gate, reconciled })
                    );
                }
            }
        }
    });
});
