import type { UpdateInfo } from "expo-updates";
import { UpdateInfoType } from "expo-updates";
import { describe, expect, it } from "vite-plus/test";

import { describeUpdate } from "./app-update";

const AT = new Date("2026-09-14T20:00:00Z");

function update(whatsNew?: string): UpdateInfo {
    return {
        createdAt: AT,
        manifest: {
            assets: [],
            createdAt: AT.toISOString(),
            extra: { expoClient: { extra: { whatsNew }, name: "Outlayr", slug: "outlayr" } },
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
        expect(describeUpdate(update("A\n  B  \n\nA"))).toStrictEqual({ at: AT, id: "u-1", notes: ["A", "B"] });
    });

    it("announces an update that carried no message", () => {
        expect(describeUpdate(update())?.notes).toStrictEqual([]);
    });

    it("has nothing to say for a rollback", () => {
        const rollback: UpdateInfo = {
            createdAt: AT,
            manifest: undefined,
            type: UpdateInfoType.ROLLBACK,
            updateId: undefined,
        };
        expect(describeUpdate(rollback)).toBeNull();
        expect(describeUpdate(undefined)).toBeNull();
    });
});
