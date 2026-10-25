import { MenuView } from "@expo/ui/community/menu";
import type { ReactNode } from "react";
import { View } from "react-native";

import type { ActionMenuItem } from "./action-menu";

interface TapMenuProps {
    accessibilityLabel: string;
    children: ReactNode;
    items: readonly ActionMenuItem[];
}

export function TapMenu({ children, items }: TapMenuProps) {
    return (
        <MenuView
            actions={items.map((item) => ({ id: item.id, image: item.icon, title: item.label }))}
            onPressAction={({ nativeEvent }) => items.find((item) => item.id === nativeEvent.event)?.onPress()}
            shouldOpenOnLongPress={false}
        >
            <View pointerEvents="none">{children}</View>
        </MenuView>
    );
}
