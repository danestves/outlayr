import { useEffect, useState } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LARGE_SHEET_TOP_INSET } from "@/lib/sheet-detents";
import { SHEET_HEADER_HEIGHT } from "@/navigation/material-chrome";

import type { SheetRest } from "./use-resting-sheet";

export type { SheetRest } from "./use-resting-sheet";

const REST_BODY_ESTIMATE = 170;
const REST_BOTTOM_ROOM = 8;

// Also declared by the root stack (`stackChrome().entrySheet`), and one object for the sheet's whole life.
const SHEET = { sheetAllowedDetents: "fitToContents", sheetResizeAnimationEnabled: false } as const;

// react-native-screens on Android reads `sheetAllowedDetents` only at creation and on keyboard or inset changes, and
// a two-detent sheet left holding one crashes on swipe ("Invalid state 4 for detentCount 1"). So the detents stay
// `fitToContents` and `height` does the moving.
export function useRestingSheet(wakeAnnouncement: string) {
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [awake, setAwake] = useState(false);
    const [bodyHeight, setBodyHeight] = useState(REST_BODY_ESTIMATE);

    useEffect(() => {
        if (awake) {
            AccessibilityInfo.announceForAccessibility(wakeAnnouncement);
        }
    }, [awake, wakeAnnouncement]);

    const height = awake
        ? windowHeight - LARGE_SHEET_TOP_INSET
        : SHEET_HEADER_HEIGHT + bodyHeight + REST_BOTTOM_ROOM + insets.bottom;
    const rest: SheetRest | undefined = awake ? undefined : { onHeight: setBodyHeight, onWake: () => setAwake(true) };

    return { awake, height, rest, sheet: SHEET };
}
