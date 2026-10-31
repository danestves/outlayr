import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { cn } from "@/components/tw";
import { hatchPathD } from "@/lib/chart-paths";

export const BAR_RADIUS = 3;

/** Diagonal rules over the part of a bar that is spent past, or trimmed off, the new amount. */
export function Hatch({ color, height, width }: { color: string; height: number; width: number }) {
    if (height <= 0 || width <= 0) {
        return null;
    }
    return (
        <View style={{ height, overflow: "hidden", width }}>
            <Svg height={height} width={width}>
                <Path d={hatchPathD(width, height, 5)} stroke={color} strokeWidth={1.2} />
            </Svg>
        </View>
    );
}

/** A month still to come: an outline, never a fill. */
export function PlannedBar({ height, tinted = false }: { height: number; tinted?: boolean }) {
    return (
        <View
            className={cn("border-[1.5px] border-dashed", tinted ? "border-tint" : "border-future")}
            style={{ borderRadius: BAR_RADIUS, height, width: "100%" }}
        />
    );
}

export function SpentBar({ height }: { height: number }) {
    return <View className="bg-foreground" style={{ borderRadius: BAR_RADIUS, height, width: "100%" }} />;
}

/** Snapped steps that read as round numbers at the size the axis runs to. */
export function planStep(axisTop: number): number {
    if (axisTop <= 500) {
        return 5;
    }
    if (axisTop <= 2500) {
        return 10;
    }
    if (axisTop <= 10_000) {
        return 50;
    }
    return 100;
}
