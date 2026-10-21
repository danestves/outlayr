import { Pressable } from "react-native";

import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { RowPressable as RowPressableBase } from "./row-pressable";

export type { RowPressableProps } from "./row-pressable";

const PRESSED_ALPHA = 0.1;

export const RowPressable: typeof RowPressableBase = (props) => {
    const m3 = useMaterialColors();
    return <Pressable android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }} {...props} />;
};
