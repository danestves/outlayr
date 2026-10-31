import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { pairs } from "../../pairs";

/** Measured, not flexed, like the budget grid: a context menu's self-sizing host collapses a `flex-1` cell. */
export function PlanGrid<T>({
    items,
    keyOf,
    renderCell,
}: {
    items: readonly T[];
    keyOf: (item: T) => string;
    renderCell: (item: T, right: boolean, width: number | null) => ReactNode;
}) {
    const [gridWidth, setGridWidth] = useState<number | null>(null);
    const width = gridWidth === null ? null : gridWidth / 2;
    return (
        <View onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
            {pairs(items).map(([left, right]) => (
                <View className="border-border flex-row border-t" key={keyOf(left)}>
                    {renderCell(left, false, width)}
                    {right === undefined ? (
                        <View className="border-border flex-1 border-l" />
                    ) : (
                        renderCell(right, true, width)
                    )}
                </View>
            ))}
        </View>
    );
}
