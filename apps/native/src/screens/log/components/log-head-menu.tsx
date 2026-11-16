import { MenuView } from "@expo/ui/community/menu";
import { View } from "react-native";

import type { LogHeadMenuProps } from "./log-head-actions";
import { LogHeadMenuLabel } from "./log-head-menu-label";

export function LogHeadMenu({ actions, label, onPressAction }: LogHeadMenuProps) {
    return (
        <MenuView
            actions={actions}
            onPressAction={({ nativeEvent }) => onPressAction(nativeEvent.event)}
            shouldOpenOnLongPress={false}
        >
            <View accessibilityLabel={label} accessibilityRole="button" pointerEvents="none">
                <LogHeadMenuLabel label={label} />
            </View>
        </MenuView>
    );
}
