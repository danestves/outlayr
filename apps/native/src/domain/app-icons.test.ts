import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { EN } from "@/i18n/catalog";

import {
    APP_ICONS,
    appIconChoice,
    appIconLabel,
    appIconTransition,
    defaultRowDetail,
    RELEASE_PRIMARY_ICON,
} from "./app-icons";
import type { AppIconState } from "./app-icons";

const nativeRoot = join(import.meta.dirname, "../..");
const ALTERNATE_ICON_NAMES = APP_ICONS.map((icon) => icon.name).filter((name) => name !== null);

function declaredInAppConfig(): string[] {
    const source = readFileSync(join(nativeRoot, "app.config.ts"), "utf-8");
    const block = /const ALTERNATE_ICONS = \[([\s\S]*?)\];/.exec(source);
    if (!block) {
        throw new Error("app.config.ts no longer declares ALTERNATE_ICONS");
    }
    return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

/** The quoted path form matches only the primaries; the alternates reach the plugin as a template literal. */
function primaryIconsInAppConfig(): string[] {
    const source = readFileSync(join(nativeRoot, "app.config.ts"), "utf-8");
    const names = [...source.matchAll(/"\.\/assets\/(\w+)\.icon"/g)].map((match) => match[1]);
    if (names.length === 0) {
        throw new Error("app.config.ts no longer names a primary icon bundle");
    }
    return names;
}

function primaryIconBranches(): { icon: string[]; extra: string[] } {
    const source = readFileSync(join(nativeRoot, "app.config.ts"), "utf-8");
    const icon = /icon:\s*isProduction\s*\?\s*"\.\/assets\/(\w+)\.icon"\s*:\s*"\.\/assets\/(\w+)\.icon"/.exec(source);
    const extra = /primaryAppIcon:\s*isProduction\s*\?\s*"(\w+)"\s*:\s*"(\w+)"/.exec(source);
    if (!icon) {
        throw new Error("app.config.ts no longer picks ios.icon on isProduction");
    }
    if (!extra) {
        throw new Error("app.config.ts no longer carries extra.primaryAppIcon on isProduction");
    }
    return { extra: [extra[1], extra[2]], icon: [icon[1], icon[2]] };
}

function iconBundlesOnDisk(): string[] {
    return readdirSync(join(nativeRoot, "assets"))
        .filter((entry) => entry.endsWith(".icon"))
        .map((entry) => entry.slice(0, -".icon".length));
}

describe("app icon catalogue", () => {
    it("offers the same alternates the build registers", () => {
        expect(declaredInAppConfig()).toStrictEqual([...ALTERNATE_ICON_NAMES]);
    });

    it("ships a bundle for every alternate it offers", () => {
        for (const name of ALTERNATE_ICON_NAMES) {
            expect(existsSync(join(nativeRoot, "assets", `${name}.icon`, "icon.json"))).toBeTruthy();
        }
    });

    it("ships a bundle for every primary a build can launch with", () => {
        for (const name of primaryIconsInAppConfig()) {
            expect(existsSync(join(nativeRoot, "assets", `${name}.icon`, "icon.json"))).toBeTruthy();
        }
    });

    it("never offers a primary as an alternate as well", () => {
        const alternates = declaredInAppConfig();
        for (const name of primaryIconsInAppConfig()) {
            expect(!alternates.includes(name)).toBeTruthy();
        }
    });

    it("carries no icon bundle no build declares", () => {
        const declared = new Set([...declaredInAppConfig(), ...primaryIconsInAppConfig()]);
        for (const name of iconBundlesOnDisk()) {
            expect(declared.has(name)).toBeTruthy();
        }
    });

    it("ships a preview for every choice, the primary included", () => {
        // Metro falls back to the nearest density, so a missing @3x fails softly as a blurry tile.
        for (const icon of APP_ICONS) {
            for (const scale of ["", "@2x", "@3x"]) {
                expect(
                    existsSync(join(nativeRoot, "assets/images/app-icon-previews", `${icon.slug}${scale}.png`))
                ).toBeTruthy();
            }
        }
    });

    it("tells the JS runtime the same primary each build stamps", () => {
        const { icon, extra } = primaryIconBranches();
        expect(extra).toStrictEqual(icon);
    });

    it("agrees with the build about which primary is the Release one", () => {
        expect(primaryIconBranches().extra[0]).toBe(RELEASE_PRIMARY_ICON);
    });
});

describe("resolving what iOS reports", () => {
    it("resolves each alternate by its catalogue name", () => {
        for (const icon of APP_ICONS) {
            expect(appIconChoice(icon.name)).toBe(icon);
        }
    });

    it("falls back to the default for a name this build no longer offers", () => {
        expect(EN[appIconLabel("OutlayrRetired")]).toBe("Default");
    });
});

describe("describing the Default row", () => {
    it("claims the paper mark in a build that stamps it", () => {
        expect(defaultRowDetail("Outlayr")).toBe("appIcon.default.detail");
    });

    it("does not claim it in a build that stamps the blueprint icon", () => {
        expect(defaultRowDetail("OutlayrTesting")).toBe("appIcon.default.detailDev");
    });

    it("does not claim it where the build named no primary at all", () => {
        expect(defaultRowDetail(null)).toBe("appIcon.default.detailDev");
    });
});

describe("choosing an icon", () => {
    const ON_MONO: AppIconState = { active: "OutlayrMono", pending: null };

    function tap(state: AppIconState, name: string | null): AppIconState {
        return appIconTransition(state, { kind: "tap", name });
    }

    it("moves the checkmark on tap, before the native call lands", () => {
        const next = tap(ON_MONO, "OutlayrInk");
        expect(next.active).toBe("OutlayrInk");
        expect(next.pending).toStrictEqual({ name: "OutlayrInk" });
    });

    it("drops a tap while a change is in flight", () => {
        const flying = tap(ON_MONO, "OutlayrInk");
        expect(tap(flying, "OutlayrEmboss")).toBe(flying);
    });

    it("treats a request for the primary as in flight too", () => {
        const flying = tap(ON_MONO, null);
        expect(flying).toStrictEqual({ active: null, pending: { name: null } });
        expect(tap(flying, "OutlayrInk")).toBe(flying);
    });

    it("keeps the requested name once the change lands", () => {
        const landed = appIconTransition(tap(ON_MONO, "OutlayrInk"), {
            kind: "resolved",
            name: "OutlayrInk",
        });
        expect(landed).toStrictEqual({ active: "OutlayrInk", pending: null });
    });

    it("restores the icon iOS reports when the change is refused", () => {
        const refused = appIconTransition(tap(ON_MONO, "OutlayrInk"), {
            kind: "rejected",
            reported: "OutlayrMono",
        });
        expect(refused).toStrictEqual({ active: "OutlayrMono", pending: null });
    });

    it("ignores a landing for a name that is no longer pending", () => {
        const refused = appIconTransition(tap(ON_MONO, "OutlayrInk"), {
            kind: "rejected",
            reported: "OutlayrMono",
        });
        expect(appIconTransition(refused, { kind: "resolved", name: "OutlayrInk" })).toBe(refused);
    });
});
