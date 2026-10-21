import { View } from "react-native";

import type { RestingSheetFrameProps } from "./resting-sheet-frame";

export function RestingSheetFrame({ height, children }: RestingSheetFrameProps) {
    return <View style={{ height }}>{children}</View>;
}
