import { describe, expect, it } from "vite-plus/test";

import { adoptionActions, adoptionPlan, choiceActions, isDestructiveChoice } from "./ledger-adoption";

describe("adoption plan", () => {
    it("has nothing to reconcile when neither side holds a ledger", () => {
        expect(adoptionPlan("empty", "empty")).toBe("fresh");
    });

    it("adopts a ledger built up before the account existed", () => {
        expect(adoptionPlan("populated", "empty")).toBe("adopt");
    });

    it("replaces an untouched install with the account's ledger", () => {
        expect(adoptionPlan("empty", "populated")).toBe("replace");
    });

    it("asks only when both sides hold a ledger", () => {
        expect(adoptionPlan("populated", "populated")).toBe("ask");
    });

    it("defers while the account's ledger cannot be read", () => {
        expect(adoptionPlan("empty", "unknown")).toBe("defer");
        expect(adoptionPlan("populated", "unknown")).toBe("defer");
    });
});

describe("adoption actions", () => {
    it("does nothing on a fresh pairing", () => {
        expect(adoptionActions("fresh")).toStrictEqual({
            pushLocal: false,
            wipeAccount: false,
            wipeLocal: false,
        });
    });

    it("pushes and destroys nothing when adopting", () => {
        expect(adoptionActions("adopt")).toStrictEqual({
            pushLocal: true,
            wipeAccount: false,
            wipeLocal: false,
        });
    });

    it("keeps the account's ledger by discarding the local replica", () => {
        expect(adoptionActions("replace")).toStrictEqual({
            pushLocal: false,
            wipeAccount: false,
            wipeLocal: true,
        });
    });

    it("has no actions of its own while the choice is unmade", () => {
        expect(adoptionActions("ask")).toBeNull();
        expect(adoptionActions("defer")).toBeNull();
    });
});

describe("adoption choice", () => {
    it("destroys nothing when merging", () => {
        expect(isDestructiveChoice("merge")).toBe(false);
        expect(choiceActions("merge")).toStrictEqual({
            pushLocal: true,
            wipeAccount: false,
            wipeLocal: false,
        });
    });

    it("discards the account's rows to keep this device's", () => {
        expect(isDestructiveChoice("keep-local")).toBe(true);
        expect(choiceActions("keep-local")).toStrictEqual({
            pushLocal: true,
            wipeAccount: true,
            wipeLocal: false,
        });
    });

    it("discards this device's rows to keep the account's", () => {
        expect(isDestructiveChoice("keep-account")).toBe(true);
        expect(choiceActions("keep-account")).toStrictEqual({
            pushLocal: false,
            wipeAccount: false,
            wipeLocal: true,
        });
    });
});
