import { useMemo } from "react";

import type { MaterialRoleColors } from "@/theme/material-roles";
import { contrastRatio } from "@/theme/material-scheme";
import { useMaterialColors } from "@/theme/use-material-colors";

import { appBarOptions, SHEET_CORNER_RADIUS } from "./material-chrome";
import type { StackChrome } from "./stack-chrome";

/**
 * Modals close with an X in the navigation icon's place, which is why `CloseToolbar` draws nothing on Android.
 * Android never gives a sheet an app bar, so the header is off and `SheetHeader` draws one inside the sheet.
 */

const BLACK = "#000000";
const WHITE = "#ffffff";

/** react-native-screens tints the nav icon before swapping in a custom image, so the image carries its own colour. */
function closeIconOn(surface: string) {
    return {
        uri: contrastRatio(WHITE, surface) > contrastRatio(BLACK, surface) ? "nano_close_light_original" : "nano_close",
    };
}

export function stackChrome(m3: MaterialRoleColors): StackChrome {
    const appBar = appBarOptions(m3);
    const sheet = {
        contentStyle: { backgroundColor: m3.surfaceContainerLow },
        headerShown: false,
        presentation: "formSheet",
        sheetCornerRadius: SHEET_CORNER_RADIUS,
    } as const;
    const pickerSheet = (detent: number) => ({ ...sheet, sheetAllowedDetents: [detent, 1] });
    const dialog = {
        ...appBar,
        animation: "slide_from_bottom",
        headerBackImageSource: closeIconOn(m3.surface),
        presentation: "modal",
    } as const;

    return {
        bareModal: { animation: "slide_from_bottom", headerShown: false, presentation: "modal" },
        // Sized by its content, not by detents (`use-resting-sheet.android.ts`).
        entrySheet: { ...sheet, sheetAllowedDetents: "fitToContents", sheetResizeAnimationEnabled: false, title: "" },
        firstRunStep: { animation: "fade", headerShadowVisible: false, headerTransparent: true, title: "" },
        // Dimmed, unlike iOS: at an undimmed detent the editor under the picker takes taps.
        identityPicker: pickerSheet,
        modal: (title) => ({ ...dialog, title }),
        paywall: { ...dialog, title: "" },
        pickerSheet,
        pushed: appBar,
        search: (title) => ({ ...appBar, animation: "slide_from_bottom", presentation: "modal", title }),
        sheet: ({ title, detent }) => ({ ...sheet, sheetAllowedDetents: [detent, 1], title }),
        titled: (title) => ({ ...appBar, title }),
    };
}

export function useStackChrome(): StackChrome {
    const m3 = useMaterialColors();
    return useMemo(() => stackChrome(m3), [m3]);
}
