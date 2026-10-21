import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface SheetGestureRootProps {
    children: ReactNode;
    fill?: boolean;
    style?: StyleProp<ViewStyle>;
}

// Nothing on iOS. On Android the sheet is a Compose `ModalBottomSheet` in its own window, outside the app's root,
// so gestures inside it never activate without a root of their own (`sheet-gesture-root.android.tsx`).
export function SheetGestureRoot({ children }: SheetGestureRootProps) {
    return children;
}
