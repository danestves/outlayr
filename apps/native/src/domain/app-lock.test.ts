import { describe, expect, it } from "@jest/globals";

import { lockFailureMessage, lockGate, lockIsUnenforceable, relocksOnPhase } from "./app-lock";

describe("app lock gate", () => {
    it("stays open while the setting is off", () => {
        expect(lockGate(false, false, null)).toBe("open");
        expect(lockGate(false, false, true)).toBe("open");
    });

    it("is shut on the frame before the enrolment probe answers", () => {
        expect(lockGate(true, false, null)).toBe("shut");
    });

    it("opens once the session is authenticated", () => {
        expect(lockGate(true, true, true)).toBe("open");
    });

    it("opens on a device that could never answer the prompt", () => {
        expect(lockGate(true, false, false)).toBe("open");
    });
});

describe("app lock re-arming", () => {
    it("re-arms when the app goes to the background", () => {
        expect(relocksOnPhase("background")).toBe(true);
    });

    it("does not re-arm while a system sheet such as Face ID makes the app inactive", () => {
        expect(relocksOnPhase("inactive")).toBe(false);
        expect(relocksOnPhase("active")).toBe(false);
    });
});

describe("app lock failures", () => {
    it("says nothing when the user backed out of the prompt", () => {
        expect(lockFailureMessage("user_cancel")).toBeNull();
        expect(lockFailureMessage("app_cancel")).toBeNull();
        expect(lockFailureMessage("system_cancel")).toBeNull();
    });

    it("explains every other failure", () => {
        for (const error of [
            "lockout",
            "authentication_failed",
            "timeout",
            "unable_to_process",
            "unknown",
            "invalid_context",
            "no_space",
            "user_fallback",
        ] as const) {
            const message = lockFailureMessage(error);
            expect(message).toBeTruthy();
        }
    });

    it("treats a device that cannot answer as unenforceable", () => {
        expect(lockIsUnenforceable("not_enrolled")).toBe(true);
        expect(lockIsUnenforceable("not_available")).toBe(true);
        expect(lockIsUnenforceable("passcode_not_set")).toBe(true);
    });

    it("keeps a hardware lockout enforceable, since the passcode still answers", () => {
        expect(lockIsUnenforceable("lockout")).toBe(false);
        expect(lockIsUnenforceable("authentication_failed")).toBe(false);
        expect(lockIsUnenforceable("user_cancel")).toBe(false);
    });
});
