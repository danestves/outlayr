import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction, MenuComponentProps, NativeActionEvent } from "@expo/ui/community/menu";
import type { ReactNode } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";

// SwiftUI menus take only an SF Symbol name and ignore an image source, so the app's Hugeicons cannot reach a row.
type ActionMenuSymbol = Extract<MenuAction["image"], string>;

export interface ActionMenuItem {
    destructive?: boolean;
    icon?: ActionMenuSymbol;
    /** Unique within one menu: the native event carries it back. */
    id: string;
    label: string;
    onPress: () => void;
}

interface ActionMenuProps {
    children: ReactNode;
    items: readonly ActionMenuItem[];
    // For a row a recycling list hands to another entry: a menu still open when the owner changes must not act on
    // the new one.
    owner?: string;
    style?: StyleProp<ViewStyle>;
}

// Since @expo/ui 57.0.15 the hosted view is measured from its children and shrinks to its content, so the outer
// view's measured width is handed to the host and its child. Until that first measure the row renders unwrapped.
export function StretchedMenuView({ children, style, ...menu }: MenuComponentProps) {
    const [width, setWidth] = useState<number | null>(null);

    const onLayout = (event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== width) {
            setWidth(next);
        }
    };

    return (
        <View onLayout={onLayout} style={[styles.stretch, style]}>
            {width === null ? (
                children
            ) : (
                <MenuView {...menu} style={{ width }}>
                    <View style={{ width }}>{children}</View>
                </MenuView>
            )}
        </View>
    );
}

export function ActionMenu({ items, owner, children, style }: ActionMenuProps) {
    // An empty menu still swallows the long press, which reads as a dead row.
    if (items.length === 0) {
        return children;
    }

    const actionId = (item: ActionMenuItem) => (owner === undefined ? item.id : `${owner}:${item.id}`);

    const actions: MenuAction[] = items.map((item) => ({
        attributes: item.destructive ? { destructive: true } : undefined,
        id: actionId(item),
        image: item.icon,
        title: item.label,
    }));

    const onPressAction = ({ nativeEvent }: NativeActionEvent) => {
        items.find((item) => actionId(item) === nativeEvent.event)?.onPress();
    };

    return (
        <StretchedMenuView actions={actions} onPressAction={onPressAction} shouldOpenOnLongPress style={style}>
            {children}
        </StretchedMenuView>
    );
}

const styles = StyleSheet.create({
    stretch: { alignSelf: "stretch" },
});
