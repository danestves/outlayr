import type { IconWeight } from "./hugeicon-raster";

export interface IconEntry {
    /** Export name in `@hugeicons-pro/core-<weight>-rounded`. */
    icon: string;
    slug: string;
    weight?: IconWeight;
    withSelected?: boolean;
    ink?: string;
    stroke?: number;
}

export interface IconSet {
    because: string;
    dir: string;
    entries: IconEntry[];
    stroke?: number;
}

const MENU_SIZE = 17;

const TOOLBAR_SIZE = 22;

const TOOLBAR_STROKE = 2;

const MENU_STROKE = (TOOLBAR_STROKE * MENU_SIZE) / TOOLBAR_SIZE;

export const SETS: IconSet[] = [
    {
        because:
            "A tab item takes an asset-catalog symbol on iOS and a drawable on Android, which `react-native-nano-icons` forges from these SVGs at prebuild.",
        dir: "tab-symbols",
        entries: [
            { icon: "TransactionHistoryIcon", slug: "log", withSelected: true },
            { icon: "Analytics01Icon", slug: "insights", withSelected: true },
            { icon: "ProgressIcon", slug: "budgets", withSelected: true },
            { icon: "Settings01Icon", slug: "settings", withSelected: true },
        ],
    },
    {
        because: "A native toolbar item takes an SF Symbol name or an image source, never a React element.",
        dir: "toolbar-symbols",
        entries: [
            { icon: "PlusSignIcon", slug: "add" },
            { icon: "Cancel01Icon", slug: "close" },
            // Android's app bar draws a custom back image untinted, so a dark bar
            // needs the glyph baked light (`stack-chrome.android.ts`).
            { icon: "Cancel01Icon", ink: "#ffffff", slug: "close-light" },
            { icon: "Delete02Icon", slug: "delete" },
            { icon: "Tick02Icon", slug: "done" },
            { icon: "Search01Icon", slug: "search" },
            { icon: "Calendar03Icon", slug: "period" },
            { icon: "ArrowUpDownIcon", slug: "reorder" },
            { icon: "MoreVerticalSquare01Icon", slug: "more" },
            // The eye shows what a tap does, not the current state: suggestions on shows the crossed-out eye.
            { icon: "ViewOffSlashIcon", slug: "suggestions-on" },
            { icon: "ViewIcon", slug: "suggestions-off" },
            { icon: "FilterHorizontalIcon", slug: "filter" },
            { icon: "FilterHorizontalIcon", slug: "filter-active", weight: "solid" },

            { icon: "Invoice01Icon", slug: "show-all", stroke: MENU_STROKE },
            { icon: "ArrowDataTransferVerticalIcon", slug: "show-type", stroke: MENU_STROKE },
            { icon: "ArrowDataTransferHorizontalIcon", slug: "show-transfers", stroke: MENU_STROKE },
            { icon: "Calendar01Icon", slug: "show-day", stroke: MENU_STROKE },
            { icon: "Calendar02Icon", slug: "show-week", stroke: MENU_STROKE },
            { icon: "Calendar03Icon", slug: "show-month", stroke: MENU_STROKE },
            { icon: "TagsIcon", slug: "show-category", stroke: MENU_STROKE },
            { icon: "RepeatIcon", slug: "show-recurring", stroke: MENU_STROKE },
            { icon: "Clock01Icon", slug: "show-upcoming", stroke: MENU_STROKE },
        ],
        // A bare 1.5 line looks thin beside the SF Symbols the OS draws in the same bar.
        stroke: TOOLBAR_STROKE,
    },
    {
        because:
            "An Android menu row draws a leading icon only from an image source; the SF Symbol names iOS menus take are dropped.",
        dir: "menu-symbols",
        entries: [
            { icon: "ArrowLeft01Icon", slug: "earlier" },
            { icon: "ArrowRight01Icon", slug: "later" },
            { icon: "ArrowTurnBackwardIcon", slug: "now" },
        ],
        stroke: 1.75,
    },
];
