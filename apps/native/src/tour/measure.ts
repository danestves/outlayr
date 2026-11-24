import type { ViewInstance } from "react-native";

import type { TourRect, TourWindow } from "./callout-layout";

export function measureInWindow(node: ViewInstance): Promise<TourRect | null> {
    return new Promise((resolve) => {
        node.measureInWindow((x, y, width, height) => {
            resolve(width > 0 && height > 0 ? { height, width, x, y } : null);
        });
    });
}

/** A target scrolled entirely off-screen has a rect, but one no spotlight can point at. */
export function rectVisibleIn(rect: TourRect, window: TourWindow): boolean {
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.x + rect.width > 0 &&
        rect.x < window.width &&
        rect.y + rect.height > 0 &&
        rect.y < window.height
    );
}
