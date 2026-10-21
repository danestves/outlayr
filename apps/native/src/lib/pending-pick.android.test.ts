import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ImagePickerResult } from "expo-image-picker";

import { launchPick, pendingPick } from "./pending-pick";
import type { PickOwner } from "./pending-pick";

jest.mock<Partial<typeof import("@react-native-async-storage/async-storage")>>(
    "@react-native-async-storage/async-storage",
    () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const mockPicker: { held: ImagePickerResult | null } = { held: null };
jest.mock<Partial<typeof import("expo-image-picker")>>("expo-image-picker", () => ({
    getPendingResultAsync: async () => {
        const { held } = mockPicker;
        mockPicker.held = null;
        return held;
    },
}));

const LAUNCHED_AT = new Date(2026, 9, 15, 12).getTime();
const MINUTE_MS = 60 * 1000;

const PHOTO: ImagePickerResult = {
    assets: [{ height: 4000, uri: "file:///cache/pending.jpg", width: 3000 }],
    canceled: false,
};

const clock = jest.spyOn(Date, "now");

async function tornDownPick(owner: PickOwner) {
    let launched: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
        launched = resolve;
    });
    launchPick(owner, () => {
        launched();
        return new Promise<ImagePickerResult>(() => {
            // Never settles.
        });
    }).catch(() => undefined);
    await started;
    mockPicker.held = PHOTO;
}

beforeEach(async () => {
    await AsyncStorage.clear();
    mockPicker.held = null;
    clock.mockReturnValue(LAUNCHED_AT);
});

describe("pendingPick on Android", () => {
    it.each([["receipt-scan", "identity-picker"]] as const)(
        "keeps a photo picked for %s from %s, and for its own screen",
        async (owner, other) => {
            await tornDownPick(owner);

            await expect(pendingPick(other)).resolves.toBeNull();
            await expect(pendingPick(owner)).resolves.toStrictEqual(PHOTO);
        }
    );

    it("drops a photo from a pick launched long before", async () => {
        await tornDownPick("receipt-scan");
        clock.mockReturnValue(LAUNCHED_AT + 2 * 24 * 60 * MINUTE_MS);

        await expect(pendingPick("receipt-scan")).resolves.toBeNull();
        expect(mockPicker.held).toBeNull();
    });

    it("recovers nothing once the launch came back on its own", async () => {
        await launchPick("receipt-scan", async () => PHOTO);
        mockPicker.held = PHOTO;

        await expect(pendingPick("receipt-scan")).resolves.toBeNull();
    });
});
