import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { SheetGestureRootProps } from "./sheet-gesture-root";

const FILL = { flex: 1 } as const;

export function SheetGestureRoot({ children, fill = false, style }: SheetGestureRootProps) {
    return <GestureHandlerRootView style={fill ? [FILL, style] : style}>{children}</GestureHandlerRootView>;
}
