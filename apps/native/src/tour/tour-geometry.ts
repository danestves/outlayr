import type { TourInsets, TourWindow } from "./callout-layout";

export type TourSlotId = "balances.add" | "log.search";

// Device-tuned estimates: a native toolbar item cannot be measured from JS.
const ITEM_SIZE = 44;
const EDGE_MARGIN = 16;
const ITEM_GAP = 8;
const BAR_HEIGHT = 44;
const ITEM_RADIUS = 22;

const SLOT_PLACEMENT = {
    "balances.add": { index: 0, side: "right" },
    "log.search": { index: 0, side: "left" },
} as const;

export interface TourSlotRect {
    height: number;
    radius: number;
    width: number;
    x: number;
    y: number;
}

export function toolbarSlot(
    window: TourWindow,
    insets: TourInsets,
    side: "left" | "right",
    indexFromEdge: number
): TourSlotRect {
    const fromEdge = EDGE_MARGIN + indexFromEdge * (ITEM_SIZE + ITEM_GAP);
    return {
        height: ITEM_SIZE,
        radius: ITEM_RADIUS,
        width: ITEM_SIZE,
        x: side === "left" ? fromEdge : window.width - fromEdge - ITEM_SIZE,
        y: insets.top + (BAR_HEIGHT - ITEM_SIZE) / 2,
    };
}

export function slotRect(slot: TourSlotId, window: TourWindow, insets: TourInsets): TourSlotRect {
    const placement = SLOT_PLACEMENT[slot];
    return toolbarSlot(window, insets, placement.side, placement.index);
}
