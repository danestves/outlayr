import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction, MenuComponentRef, NativeActionEvent } from "@expo/ui/community/menu";
import type { Ref } from "react";
import { View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { useIsDark } from "@/theme/use-is-dark";

interface RowMenuProps {
    /** Items without an `icon`: Android only draws image sources, not SF Symbols. */
    items: readonly ActionMenuItem[];
    leading: number;
    /** The row opens the menu with `ref.current?.show()` from its own `onLongPress`. */
    ref: Ref<MenuComponentRef>;
}

// The row is not the trigger, unlike `ActionMenu`: Android hosts a `MenuView` trigger in Compose, which shrinks the
// row and takes it out of the swipe around it. `show()` is a no-op on iOS, whose rows use `ActionMenu`.
export function RowMenu({ items, leading, ref }: RowMenuProps) {
    const isDark = useIsDark();
    const actions: MenuAction[] = items.map((item) => ({
        attributes: item.destructive ? { destructive: true } : undefined,
        id: item.id,
        title: item.label,
    }));

    const onPressAction = ({ nativeEvent }: NativeActionEvent) => {
        items.find((item) => item.id === nativeEvent.event)?.onPress();
    };

    return (
        <MenuView
            actions={actions}
            colorScheme={isDark ? "dark" : "light"}
            onPressAction={onPressAction}
            ref={ref}
            style={{ bottom: 0, left: leading, position: "absolute" }}
        >
            <View pointerEvents="none" style={{ height: 1, width: 1 }} />
        </MenuView>
    );
}
