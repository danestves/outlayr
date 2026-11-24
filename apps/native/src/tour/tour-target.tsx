import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTourTarget } from "./use-tour-target";

interface TourTargetProps {
    id: string;
    radius: number | "half";
    style?: StyleProp<ViewStyle>;
}

/** An invisible twin of a view that cannot be measured itself (a SwiftUI or Compose surface). */
export function TourTarget({ id, radius, style }: TourTargetProps) {
    const attach = useTourTarget(id, radius);
    return <View collapsable={false} pointerEvents="none" ref={attach} style={style} />;
}
