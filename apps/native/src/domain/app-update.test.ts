import type { UpdateInfo } from "expo-updates";
import { UpdateInfoType } from "expo-updates";
import { describe, expect, it } from "vite-plus/test";

import { describeUpdate } from "./app-update";

const AT = new Date("2026-09-14T20:00:00Z");

function update(whatsNew?: string, whatsNewByLanguage?: Record<string, string>): UpdateInfo {
    return {
        createdAt: AT,
        manifest: {
            assets: [],
            createdAt: AT.toISOString(),
            extra: { expoClient: { extra: { whatsNew, whatsNewByLanguage }, name: "Outlayr", slug: "outlayr" } },
            id: "u-1",
            launchAsset: { url: "https://x" },
            metadata: {},
            runtimeVersion: "abc",
        },
        type: UpdateInfoType.NEW,
        updateId: "u-1",
    };
}

describe("describeUpdate", () => {
    it("reads one note per distinct line of the publish message", () => {
        expect(describeUpdate(update("A\n  B  \n\nA"), "en")).toStrictEqual({ at: AT, id: "u-1", notes: ["A", "B"] });
    });

    it("reads the notes in the app's language, and English when the update has none in it", () => {
        const localized = update("Faster", { en: "Faster", "es-ES": "Más rápido\nMejor" });
        expect(describeUpdate(localized, "es-ES")?.notes).toStrictEqual(["Más rápido", "Mejor"]);
        expect(describeUpdate(localized, "es")?.notes).toStrictEqual(["Faster"]);
    });

    it("announces an update that carried no message", () => {
        expect(describeUpdate(update(), "en")?.notes).toStrictEqual([]);
    });

    it("has nothing to say for a rollback", () => {
        const rollback: UpdateInfo = {
            createdAt: AT,
            manifest: undefined,
            type: UpdateInfoType.ROLLBACK,
            updateId: undefined,
        };
        expect(describeUpdate(rollback, "en")).toBeNull();
        expect(describeUpdate(undefined, "en")).toBeNull();
    });
});
