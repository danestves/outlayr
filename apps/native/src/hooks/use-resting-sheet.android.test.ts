import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { LARGE_SHEET_TOP_INSET } from "@/lib/sheet-detents";
import { SHEET_HEADER_HEIGHT } from "@/navigation/material-chrome";

import { useRestingSheet } from "./use-resting-sheet.android";

const mockWindow = { fontScale: 1, height: 915, scale: 2.625, width: 412 };
const mockInsets = { bottom: 24, left: 0, right: 0, top: 32 };
const REST_BOTTOM_ROOM = 8;

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
    __esModule: true,
    default: () => mockWindow,
}));
jest.mock("react-native-safe-area-context", () => ({
    useSafeAreaInsets: () => mockInsets,
}));

describe("useRestingSheet on Android", () => {
    it("declares the same fitToContents options at rest and awake", async () => {
        const { result } = await renderHook(() => useRestingSheet("Edit"));
        const resting = result.current.sheet;

        await act(async () => {
            result.current.rest?.onWake();
        });

        expect(result.current.awake).toBe(true);
        expect(result.current.sheet).toBe(resting);
        expect(resting).toStrictEqual({ sheetAllowedDetents: "fitToContents", sheetResizeAnimationEnabled: false });
    });

    it("rests at the header plus the measured body, and wakes to the tallest sheet", async () => {
        const { result } = await renderHook(() => useRestingSheet("Edit"));

        await act(async () => {
            result.current.rest?.onHeight(300);
        });
        expect(result.current.height).toBe(SHEET_HEADER_HEIGHT + 300 + REST_BOTTOM_ROOM + mockInsets.bottom);

        await act(async () => {
            result.current.rest?.onWake();
        });
        expect(result.current.height).toBe(mockWindow.height - LARGE_SHEET_TOP_INSET);
        expect(result.current.rest).toBeUndefined();
    });
});
