import type { ReactNode } from "react";

export interface RestingSheetFrameProps {
    height: number | undefined;
    children: ReactNode;
}

// Nothing on iOS, where detents move the sheet; on Android the sheet fits its content, so this frame raises it.
export function RestingSheetFrame({ children }: RestingSheetFrameProps) {
    return children;
}
