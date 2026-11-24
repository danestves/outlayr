export interface TourRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

export interface TourInsets {
    bottom: number;
    top: number;
}

export interface TourWindow {
    height: number;
    width: number;
}

export interface TourBubbleSize {
    height: number;
    width: number;
}

export interface TourHole extends TourRect {
    radius: number;
}

/** The hole hugs the target, so its corner radius grows by the same amount on every side. */
export const HOLE_INFLATION = 6;

export const CALLOUT_GAP = 12;
export const SCREEN_MARGIN = 16;
export const POINTER_WIDTH = 16;
export const POINTER_HEIGHT = 8;

const POINTER_CLEARANCE = 24;

interface CalloutInput {
    bubble: TourBubbleSize;
    insets: TourInsets;
    radius: number;
    target: TourRect;
    window: TourWindow;
}

export interface TourCallout {
    above: boolean;
    bubble: TourRect;
    hole: TourHole;
    pointerX: number;
}

export function holeRect(target: TourRect, radius: number): TourHole {
    return {
        height: target.height + HOLE_INFLATION * 2,
        radius: radius + HOLE_INFLATION,
        width: target.width + HOLE_INFLATION * 2,
        x: target.x - HOLE_INFLATION,
        y: target.y - HOLE_INFLATION,
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

function intersects(a: TourRect, b: TourRect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * A bubble clamped into the safe area can land back on the hole, so the other side wins when only it is clear.
 * Nothing fits when the bubble is taller than the window, which no step's copy produces.
 */
export function calloutLayout({ bubble, insets, radius, target, window }: CalloutInput): TourCallout {
    const hole = holeRect(target, radius);
    const centerX = hole.x + hole.width / 2;
    const x = clamp(centerX - bubble.width / 2, SCREEN_MARGIN, window.width - SCREEN_MARGIN - bubble.width);
    const pointerX = clamp(centerX - x, POINTER_CLEARANCE, bubble.width - POINTER_CLEARANCE);

    const minY = insets.top;
    const maxY = window.height - insets.bottom - bubble.height;
    const place = (y: number): TourRect => ({ height: bubble.height, width: bubble.width, x, y: clamp(y, minY, maxY) });

    const above = place(hole.y - CALLOUT_GAP - bubble.height);
    const below = place(hole.y + hole.height + CALLOUT_GAP);
    const prefersAbove = hole.y + hole.height / 2 > window.height / 2;
    const preferred = prefersAbove ? above : below;
    const fallback = prefersAbove ? below : above;
    const placed = intersects(preferred, hole) && !intersects(fallback, hole) ? fallback : preferred;

    return { above: placed.y < hole.y, bubble: placed, hole, pointerX };
}
