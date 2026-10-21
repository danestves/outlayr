import { MenuView } from "@expo/ui/community/menu";
import type { MenuAction, NativeActionEvent } from "@expo/ui/community/menu";
import { Box, DropdownMenu, DropdownMenuItem, Text as ComposeText } from "@expo/ui/jetpack-compose";
import type { ReactNode } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { GestureDetector, useLongPressGesture } from "react-native-gesture-handler";

import { MaterialHost } from "@/components/material-host";
import { useHaptics } from "@/lib/use-haptics";
import { useMaterialColors } from "@/theme/use-material-colors";

import type {
    ActionMenu as ActionMenuBase,
    ActionMenuItem,
    StretchedMenuView as StretchedMenuViewBase,
} from "./action-menu";

interface MenuAnchor {
    x: number;
    y: number;
}

// Matches how `@expo/ui`'s own Android menu derives a row's identifier.
function actionId(action: MenuAction): string {
    return action.id ?? action.title;
}

function flatActions(actions: readonly MenuAction[]): MenuAction[] {
    return actions.flatMap((action) =>
        action.subactions && action.subactions.length > 0 ? flatActions(action.subactions) : [action]
    );
}

// Mounted only while open, so an idle row in a long list carries no Compose host.
function MenuPopup({
    actions,
    anchor,
    onClose,
    onPressAction,
}: {
    actions: readonly MenuAction[];
    anchor: MenuAnchor;
    onClose: () => void;
    onPressAction?: (event: NativeActionEvent) => void;
}) {
    const m3 = useMaterialColors();
    return (
        <MaterialHost matchContents style={[styles.anchor, { left: anchor.x, top: anchor.y }]}>
            <DropdownMenu color={m3.surfaceContainer} expanded onDismissRequest={onClose}>
                <DropdownMenu.Trigger>
                    <Box />
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    {flatActions(actions)
                        .filter((action) => action.attributes?.hidden !== true)
                        .map((action) => (
                            <DropdownMenuItem
                                elementColors={action.attributes?.destructive ? { textColor: m3.error } : undefined}
                                enabled={action.attributes?.disabled !== true}
                                key={actionId(action)}
                                onClick={() => {
                                    onClose();
                                    onPressAction?.({ nativeEvent: { event: actionId(action) } });
                                }}
                            >
                                <DropdownMenuItem.Text>
                                    <ComposeText style={{ fontFamily: "GoogleSansFlex_400Regular" }}>
                                        {action.title}
                                    </ComposeText>
                                </DropdownMenuItem.Text>
                                {action.state === "on" ? (
                                    <DropdownMenuItem.TrailingIcon>
                                        <ComposeText>✓</ComposeText>
                                    </DropdownMenuItem.TrailingIcon>
                                ) : null}
                            </DropdownMenuItem>
                        ))}
                </DropdownMenu.Items>
            </DropdownMenu>
        </MaterialHost>
    );
}

// A gesture-handler long press, not a `Pressable`: the row's own `Pressable` takes every touch first, so a wrapping
// one never sees the long press. Activating cancels the row's press.
function LongPressMenu({
    actions,
    children,
    onPressAction,
    owner,
    style,
}: {
    actions: readonly MenuAction[];
    children: ReactNode;
    onPressAction?: (event: NativeActionEvent) => void;
    owner?: string;
    style?: StyleProp<ViewStyle>;
}) {
    const haptics = useHaptics();
    const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
    const [shownOwner, setShownOwner] = useState(owner);
    if (shownOwner !== owner) {
        setShownOwner(owner);
        setAnchor(null);
    }
    const longPress = useLongPressGesture({
        onActivate: (event) => {
            haptics("heavy");
            setAnchor({ x: event.x, y: event.y });
        },
        runOnJS: true,
    });

    return (
        <GestureDetector gesture={longPress}>
            <View collapsable={false} style={[styles.stretch, style]}>
                {children}
                {anchor === null ? null : (
                    <MenuPopup
                        actions={actions}
                        anchor={anchor}
                        onClose={() => setAnchor(null)}
                        onPressAction={onPressAction}
                    />
                )}
            </View>
        </GestureDetector>
    );
}

// A tap menu keeps `@expo/ui`'s own, whose trigger is the whole row and so does get the tap.
export const StretchedMenuView: typeof StretchedMenuViewBase = ({
    actions,
    children,
    onPressAction,
    shouldOpenOnLongPress,
    style,
    ...menu
}) => {
    if (!shouldOpenOnLongPress) {
        return (
            <MenuView {...menu} actions={actions} onPressAction={onPressAction} style={[styles.stretch, style]}>
                {children}
            </MenuView>
        );
    }
    return (
        <LongPressMenu actions={actions} onPressAction={onPressAction} style={style}>
            {children}
        </LongPressMenu>
    );
};

export const ActionMenu: typeof ActionMenuBase = ({ items, owner, children, style }) => {
    // An empty menu would still swallow the long press.
    if (items.length === 0) {
        return children;
    }
    const actions: MenuAction[] = items.map((item: ActionMenuItem) => ({
        attributes: item.destructive ? { destructive: true } : undefined,
        id: item.id,
        title: item.label,
    }));
    return (
        <LongPressMenu
            actions={actions}
            onPressAction={({ nativeEvent }) => items.find((item) => item.id === nativeEvent.event)?.onPress()}
            owner={owner}
            style={style}
        >
            {children}
        </LongPressMenu>
    );
};

const styles = StyleSheet.create({
    anchor: { position: "absolute" },
    stretch: { alignSelf: "stretch" },
});
