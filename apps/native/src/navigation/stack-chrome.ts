import type { NativeStackNavigationOptions } from "expo-router";

import type { MaterialRoleColors } from "@/theme/material-roles";

type Options = NativeStackNavigationOptions;

/**
 * `options` rather than `<Stack.Header>` children: a layout matches those by element type, so they can't vary per
 * platform. `stack-chrome.test.tsx` holds this iOS file to exactly what those children produced.
 */
export interface StackChrome {
    titled: (title: string) => Options;
    pushed: Options;
    sheet: (sheet: { title: string; detent: number }) => Options;
    /** iOS sets the detents from inside the sheet (`useRestingSheet`); Android reads them only at creation. */
    entrySheet: Options;
    pickerSheet: (detent: number) => Options;
    /** iOS rests it undimmed so the editor's identity can fly up into it; Android dims it instead. */
    identityPicker: (detent: number) => Options;
    modal: (title: string) => Options;
    bareModal: Options;
    search: (title: string) => Options;
    paywall: Options;
    /** `minimal` drops the back title, which would otherwise read the cover's title from behind it. */
    firstRunStep: Options;
}

const TRANSPARENT_HEADER = { headerTransparent: true } as const;
const MINIMAL_BACK = { headerBackButtonDisplayMode: "minimal" } as const;

const pickerSheet = (detent: number): Options => ({
    headerShown: false,
    presentation: "formSheet",
    sheetAllowedDetents: [detent, 1],
    sheetCornerRadius: 40,
    sheetGrabberVisible: true,
});

const CHROME: StackChrome = {
    bareModal: { headerShown: false, presentation: "modal" },
    entrySheet: { ...TRANSPARENT_HEADER, presentation: "formSheet", title: "" },
    firstRunStep: {
        animation: "fade",
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerTransparent: true,
        title: "",
    },
    identityPicker: (detent) => ({ ...pickerSheet(detent), sheetLargestUndimmedDetentIndex: 0 }),
    modal: (title) => ({ ...TRANSPARENT_HEADER, ...MINIMAL_BACK, presentation: "modal", title }),
    paywall: { ...TRANSPARENT_HEADER, presentation: "modal", sheetGrabberVisible: true, title: "" },
    pickerSheet,
    pushed: {},
    search: (title) => ({ ...TRANSPARENT_HEADER, presentation: "modal", sheetGrabberVisible: true, title }),
    sheet: ({ title, detent }) => ({
        ...TRANSPARENT_HEADER,
        ...MINIMAL_BACK,
        presentation: "formSheet",
        sheetAllowedDetents: [detent, 1],
        sheetGrabberVisible: true,
        title,
    }),
    titled: (title) => ({ ...TRANSPARENT_HEADER, ...MINIMAL_BACK, title }),
};

export function stackChrome(_m3: MaterialRoleColors): StackChrome {
    return CHROME;
}

export function useStackChrome(): StackChrome {
    return CHROME;
}
