import type { ReactNode } from "react";

// iOS needs nothing: the sheet's own pan yields to a gesture-handler pan inside it.
export function SheetDragRegion({ children }: { children: ReactNode }) {
    return children;
}
