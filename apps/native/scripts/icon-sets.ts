/**
 * Every Hugeicon that native chrome draws, and where it goes.
 *
 * Native chrome never accepts a React element for an icon — a tab item takes an
 * image source because `Icon.src` only unwraps expo-router's own `VectorIcon`, a
 * toolbar item takes an SF Symbol name or an image source, and a SwiftUI swipe
 * action takes an SF Symbol or a pure-SwiftUI label. Hugeicons is SVG, so any
 * glyph that lands in one of those has to be written out first.
 *
 * Adding a glyph is a line in `SETS` and a re-run of `vp run gen:icons`.
 */

import type { IconWeight } from "./hugeicon-raster";

export interface IconEntry {
    /** Export name in `@hugeicons-pro/core-<weight>-rounded`. */
    icon: string;
    /** Output basename, and the key its consumer imports it by. */
    slug: string;
    /** Defaults to the set's weight. */
    weight?: IconWeight;
    /** Also writes `<slug>-selected` from the solid weight, for on/off pairs. */
    withSelected?: boolean;
    /** Baked RGB, for a consumer that draws the bitmap untinted. Defaults to black. */
    ink?: string;
    stroke?: number;
}

export interface IconSet {
    /** Why these have to be written out at all — kept next to the set it explains. */
    because: string;
    /** Output directory, `assets/<dir>`. Also the name `gen:icons` filters on. */
    dir: string;
    entries: IconEntry[];
    /** Stroke width. Omit to keep the 1.5 the package bakes in. */
    stroke?: number;
}

/** Points. Swift's `LogView.menuIconSize` for a row inside a menu. */
const MENU_SIZE = 17;

// Points. What Swift's `ToolbarIcon` defaults to for a toolbar button.
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
            // Swift reads the eye as the state you get by tapping, not the state you
            // are in: suggestions on shows the crossed-out eye, because tapping hides
            // them.
            { icon: "ViewOffSlashIcon", slug: "suggestions-on" },
            { icon: "ViewIcon", slug: "suggestions-off" },
            // The filter button swaps weight rather than glyph while a filter is on.
            { icon: "FilterHorizontalIcon", slug: "filter" },
            { icon: "FilterHorizontalIcon", slug: "filter-active", weight: "solid" },

            // One per `LogFilter`, matching Swift's `FilterType.iconNames`. Swift's
            // month row settled for calendar-04 because the bundled font shipped
            // calendar-03 without a ligature; drawing from SVG has no such gap, so
            // month gets the glyph it was always meant to have.
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
        // A bare 1.5 line looks thin beside the SF Symbols the OS draws in the same
        // bar. Scaled down for menu rows, which are smaller to begin with.
        stroke: TOOLBAR_STROKE,
    },
    {
        because:
            "An Android menu row draws a leading icon only from an image source; the SF Symbol names iOS menus take are dropped.",
        dir: "menu-symbols",
        // The SF Symbols the scope chips' window menus name: chevron.left,
        // chevron.right and arrow.uturn.backward.
        entries: [
            { icon: "ArrowLeft01Icon", slug: "earlier" },
            { icon: "ArrowRight01Icon", slug: "later" },
            { icon: "ArrowTurnBackwardIcon", slug: "now" },
        ],
        stroke: 1.75,
    },
];
