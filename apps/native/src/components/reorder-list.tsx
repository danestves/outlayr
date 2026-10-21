import DragDropVerticalIcon from "@hugeicons-pro/core-stroke-rounded/DragDropVerticalIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { AccessibilityActionEvent, LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { moveItem, slotAt } from "@/domain/reorder";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { useMaterialColors } from "@/theme/use-material-colors";

const ROW_MIN_HEIGHT = 56;
const SETTLE_MS = 180;

interface ReorderListProps<T> {
    items: readonly T[];
    keyOf: (item: T) => string;
    labelOf: (item: T) => string;
    /** Once per drop or move action; a rejection puts the rows back in the saved order. */
    onReorder: (keys: string[]) => Promise<void>;
    /** Keep it to one line: every row takes the first row's height. */
    renderItem: (item: T) => ReactNode;
}

interface DragState {
    active: SharedValue<string | null>;
    origin: SharedValue<number>;
    order: SharedValue<string[]>;
    picked: SharedValue<string[]>;
    travel: SharedValue<number>;
}

// For Android, where `@expo/ui` has no Compose `onMove`. Rows are placed by the shared `order`, not React's, so a
// drop reshuffles them on the UI thread and the write that follows re-renders them in the slots they hold.
export function ReorderList<T>({ items, keyOf, labelOf, onReorder, renderItem }: ReorderListProps<T>) {
    const keys = items.map(keyOf);
    const [rowHeight, setRowHeight] = useState(ROW_MIN_HEIGHT);
    const drag: DragState = {
        active: useSharedValue<string | null>(null),
        origin: useSharedValue(0),
        order: useSharedValue(keys),
        picked: useSharedValue(keys),
        travel: useSharedValue(0),
    };
    const { order } = drag;
    const signature = keys.join("\n");

    useEffect(() => {
        order.set(signature.length === 0 ? [] : signature.split("\n"));
    }, [order, signature]);

    const commit = (next: string[]) => {
        order.set(next);
        // The saved order never changed, so the effect above won't put the rows back on its own.
        onReorder(next).catch((error) => {
            order.set(keys);
            console.error("Failed to save the new order", error);
        });
    };

    const measure = (event: LayoutChangeEvent) => {
        const next = Math.max(ROW_MIN_HEIGHT, event.nativeEvent.layout.height);
        if (next !== rowHeight) {
            setRowHeight(next);
        }
    };

    return (
        <View style={{ height: rowHeight * items.length }}>
            {items.map((item, index) => (
                <ReorderRow
                    commit={commit}
                    count={items.length}
                    drag={drag}
                    id={keys[index]}
                    index={index}
                    key={keys[index]}
                    keys={keys}
                    label={labelOf(item)}
                    onLayout={index === 0 ? measure : undefined}
                    rowHeight={rowHeight}
                >
                    {renderItem(item)}
                </ReorderRow>
            ))}
        </View>
    );
}

interface ReorderRowProps {
    children: ReactNode;
    commit: (keys: string[]) => void;
    count: number;
    drag: DragState;
    id: string;
    index: number;
    keys: readonly string[];
    label: string;
    onLayout?: (event: LayoutChangeEvent) => void;
    rowHeight: number;
}

function ReorderRow({ children, commit, count, drag, id, index, keys, label, onLayout, rowHeight }: ReorderRowProps) {
    const t = useTranslation();
    const haptic = useHaptics();
    const m3 = useMaterialColors();
    const [lifted, setLifted] = useState(false);
    const { active, origin, order, picked, travel } = drag;
    const top = useSharedValue(index * rowHeight);

    useAnimatedReaction(
        () => {
            const slot = order.get().indexOf(id);
            return (slot === -1 ? index : slot) * rowHeight;
        },
        (next, previous) => {
            if (active.get() === id) {
                return;
            }
            top.set(previous === null ? next : withTiming(next, { duration: SETTLE_MS }));
        }
    );

    const pan = usePanGesture({
        minDistance: 0,
        onActivate: () => {
            "worklet";
            active.set(id);
            origin.set(top.get());
            picked.set(order.get());
            travel.set(0);
            scheduleOnRN(setLifted, true);
            scheduleOnRN(haptic, "light");
        },
        onUpdate: (event) => {
            "worklet";
            if (active.get() !== id) {
                return;
            }
            travel.set(event.translationY);
            const current = order.get();
            const from = current.indexOf(id);
            const to = slotAt(origin.get() + event.translationY, rowHeight, count);
            if (from !== -1 && to !== from) {
                order.set(moveItem(current, from, to));
                scheduleOnRN(haptic, "selection");
            }
        },
        onFinalize: () => {
            "worklet";
            if (active.get() !== id) {
                return;
            }
            const settled = order.get();
            top.set(origin.get() + travel.get());
            top.set(withTiming(settled.indexOf(id) * rowHeight, { duration: SETTLE_MS }));
            active.set(null);
            scheduleOnRN(setLifted, false);
            if (settled.join("\n") !== picked.get().join("\n")) {
                scheduleOnRN(commit, settled);
            }
        },
    });

    const placed = useAnimatedStyle(() => {
        const dragging = active.get() === id;
        return {
            transform: [{ translateY: dragging ? origin.get() + travel.get() : top.get() }],
            zIndex: dragging ? 1 : 0,
        };
    });

    const actions = [
        ...(index > 0 ? [{ label: t("common.moveUp"), name: "moveUp" }] : []),
        ...(index < count - 1 ? [{ label: t("common.moveDown"), name: "moveDown" }] : []),
    ];

    const onAccessibilityAction = ({ nativeEvent }: AccessibilityActionEvent) => {
        const step = nativeEvent.actionName === "moveUp" ? -1 : 1;
        commit(moveItem(keys, index, index + step));
    };

    return (
        <Animated.View
            accessibilityActions={actions}
            accessibilityLabel={label}
            accessible
            className={lifted ? "bg-m3-surface-container-high" : "bg-m3-surface"}
            onAccessibilityAction={onAccessibilityAction}
            onLayout={onLayout}
            style={[
                { left: 0, minHeight: ROW_MIN_HEIGHT, position: "absolute", right: 0, top: 0 },
                lifted ? { elevation: 3 } : null,
                placed,
            ]}
        >
            <View className="border-m3-outline-variant flex-1 flex-row items-center border-b pl-4">
                <View className="flex-1">{children}</View>
                <GestureDetector gesture={pan}>
                    <View className="h-14 w-14 items-center justify-center" hitSlop={4}>
                        <HugeiconsIcon color={m3.onSurfaceVariant} icon={DragDropVerticalIcon} size={24} />
                    </View>
                </GestureDetector>
            </View>
        </Animated.View>
    );
}
