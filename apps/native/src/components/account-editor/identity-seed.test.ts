import { describe, expect, it } from "vite-plus/test";

import type { BoolSettingKey } from "@/data/settings-core";

import { accountIdentityLookup, logoMayReplaceIdentity } from "./identity-seed";

const NO_IDENTITY = { emoji: null, icon: null, imageKey: null, imageUri: null, kind: "asset" };

function settings(...on: BoolSettingKey[]) {
    return (key: BoolSettingKey) => on.includes(key);
}

describe("accountIdentityLookup", () => {
    it("never sends the name to the cloud without AI consent", () => {
        expect(accountIdentityLookup("create", null, settings("aiEnrichment")).remoteEnabled).toBe(false);
        expect(accountIdentityLookup("create", null, settings("aiConsentV2", "aiEnrichment")).remoteEnabled).toBe(true);
    });

    it.each([
        ["a new account", true, "create", null],
        ["an account saved without an identity", true, "edit", NO_IDENTITY],
        ["an account with a stored emoji", false, "edit", { ...NO_IDENTITY, emoji: "🏦" }],
        ["a synced photo not yet downloaded", false, "edit", { ...NO_IDENTITY, imageKey: "photos/a1" }],
        ["a person", false, "edit", { ...NO_IDENTITY, kind: "person" }],
    ] as const)("looks up a logo for %s: %s", (_label, enabled, mode, loaded) => {
        expect(accountIdentityLookup(mode, loaded, settings()).enabled).toBe(enabled);
    });
});

describe("logoMayReplaceIdentity", () => {
    it("lets a suggestion replace only an empty tile or an earlier suggestion", () => {
        expect(logoMayReplaceIdentity("initial", false, false)).toBe(true);
        expect(logoMayReplaceIdentity("suggested", false, true)).toBe(true);
        expect(logoMayReplaceIdentity("initial", false, true)).toBe(false);
        expect(logoMayReplaceIdentity("user", false, false)).toBe(false);
        expect(logoMayReplaceIdentity("initial", true, false)).toBe(false);
    });
});
