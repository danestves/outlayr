import { describe, expect, it } from "@jest/globals";

import { localShellReady, routeSettled } from "./splash-gate";

describe("local shell readiness", () => {
    it("holds while the fonts are still loading", () => {
        expect(
            localShellReady({
                data: "ready",
                fontsLoaded: false,
            })
        ).toBe(false);
    });

    it("holds on a database that failed to open", () => {
        expect(
            localShellReady({
                data: "error",
                fontsLoaded: true,
            })
        ).toBe(false);
    });

    it("opens once the fonts and the database are both in", () => {
        expect(
            localShellReady({
                data: "ready",
                fontsLoaded: true,
            })
        ).toBe(true);
    });
});

describe("route settlement", () => {
    it("holds while a session with no cached copy is being read", () => {
        expect(routeSettled({ adoption: "settled", gate: "restoring" })).toBe(false);
    });

    it("holds while the account's ledger is being reconciled", () => {
        expect(routeSettled({ adoption: "resolving", gate: "signed-in" })).toBe(false);
    });

    it("settles on a signed-in device with nothing to reconcile", () => {
        expect(routeSettled({ adoption: "settled", gate: "signed-in" })).toBe(true);
    });

    it("local restore skips the account wait", () => {
        expect(routeSettled({ adoption: "resolving", gate: "unconfigured" })).toBe(true);
    });

    it("settles once reconciliation has a question to ask", () => {
        expect(routeSettled({ adoption: "ask", gate: "signed-in" })).toBe(true);
    });
});
