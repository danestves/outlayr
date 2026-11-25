import { describe, expect, it } from "vite-plus/test";

import { banksScreen, byInstitution, defaultCountry, needsSignIn } from "./linked-banks";
import type { BankOverviewView, BanksScreenInput, LinkedBankAccount } from "./linked-banks";

function account(overrides: Partial<LinkedBankAccount> = {}): LinkedBankAccount {
    return {
        id: "bank-1" as LinkedBankAccount["id"],
        filesInto: null,
        institution: "Chase",
        kind: "cash",
        last4: "4417",
        linkedAt: 1,
        name: "Checking",
        provider: "stripe",
        pulledAt: null,
        status: "active",
        ...overrides,
    };
}

function input(overview: Partial<BankOverviewView>, overrides: Partial<BanksScreenInput> = {}): BanksScreenInput {
    return {
        mode: "list",
        overview: {
            kind: "ready",
            overview: { access: "allowed", accounts: [], countries: ["US", "CA"], ...overview },
        },
        personal: true,
        signedIn: true,
        stripeReady: true,
        syncOn: true,
        ...overrides,
    };
}

describe("banksScreen", () => {
    it("hides bank linking before launch, without Stripe, or signed out", () => {
        expect(banksScreen(input({ access: "unavailable", accounts: [account()] })).kind).toBe("hidden");
        expect(banksScreen(input({}, { stripeReady: false })).kind).toBe("hidden");
        expect(banksScreen(input({}, { signedIn: false })).kind).toBe("hidden");
    });

    it("keeps linked accounts listed after the plan lapses, with sync off, outside Personal", () => {
        const screen = banksScreen(
            input({ access: "plan", accounts: [account()] }, { personal: false, syncOn: false })
        );
        expect(screen.kind).toBe("list");
    });

    it("asks for the plan before sync, and sync before the Personal profile", () => {
        expect(banksScreen(input({ access: "plan" }, { personal: false, syncOn: false }))).toStrictEqual({
            gate: "free",
            kind: "gate",
        });
        expect(banksScreen(input({}, { personal: false, syncOn: false }))).toStrictEqual({
            gate: "sync",
            kind: "gate",
        });
        expect(banksScreen(input({}, { personal: false }))).toStrictEqual({ gate: "personal", kind: "gate" });
    });

    it("opens the link entry from the list even when accounts exist", () => {
        expect(banksScreen(input({ accounts: [account()] }, { mode: "link" }))).toStrictEqual({
            countries: ["US", "CA"],
            kind: "entry",
        });
        expect(banksScreen(input({ access: "plan", accounts: [account()] }, { mode: "link" })).kind).toBe("gate");
    });
});

describe("byInstitution", () => {
    it("groups accounts under their bank, oldest link first", () => {
        const groups = byInstitution([
            account({ id: "a" as LinkedBankAccount["id"], institution: "Amex", linkedAt: 5, name: "Gold" }),
            account({ id: "b" as LinkedBankAccount["id"], institution: "Chase", linkedAt: 2, name: "Savings" }),
            account({ id: "c" as LinkedBankAccount["id"], institution: "Chase", linkedAt: 3, name: "Checking" }),
        ]);
        expect(groups.map((group) => [group.institution, group.accounts.map((row) => row.name)])).toStrictEqual([
            ["Chase", ["Checking", "Savings"]],
            ["Amex", ["Gold"]],
        ]);
    });
});

describe("needsSignIn", () => {
    it("finds an account whose bank sign-in expired", () => {
        const expired = account({ id: "x" as LinkedBankAccount["id"], status: "relink" });
        const ready = input({ accounts: [account(), expired] }).overview;
        expect(needsSignIn(ready)).toBe(expired);
        expect(needsSignIn({ kind: "loading" })).toBeNull();
    });
});

describe("defaultCountry", () => {
    it("opens on the phone's country when a provider covers it", () => {
        expect(defaultCountry(["US", "CA"], "ca")).toBe("CA");
        expect(defaultCountry(["US", "CA"], "VE")).toBe("US");
        expect(defaultCountry([], "US")).toBeNull();
    });
});
