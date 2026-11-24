import { createContext, use } from "react";
import type { ViewInstance } from "react-native";

import type { TourRect } from "./callout-layout";
import type { TourStep } from "./steps";
import type { TourId } from "./tour-state";

export interface TourTargetEntry {
    node: ViewInstance;
    radius: number | "half";
    reveal?: (node: ViewInstance) => Promise<void>;
}

export interface ActiveTour {
    index: number;
    tour: TourId;
}

export interface TourStage {
    index: number;
    key: string;
    radius: number;
    rect: TourRect;
    step: TourStep;
    tour: TourId;
}

export interface TourContextValue {
    active: ActiveTour | null;
    blocked: boolean;
    cancel: (tour: TourId) => void;
    complete: () => void;
    next: () => void;
    register: (id: string, entry: TourTargetEntry) => void;
    replay: () => void;
    seen: ReadonlySet<TourId> | null;
    skip: () => void;
    stage: TourStage | null;
    start: (tour: TourId) => void;
    unregister: (id: string, node: ViewInstance) => void;
}

export const TourContext = createContext<TourContextValue | undefined>(undefined);

export function useTour(): TourContextValue {
    const context = use(TourContext);
    if (!context) {
        throw new Error("useTour must be used within TourProvider");
    }
    return context;
}
