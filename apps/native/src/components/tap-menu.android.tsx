import { View } from "react-native";

import { MaterialMenu } from "./material-menu";
import type { TapMenu as TapMenuBase } from "./tap-menu";

export const TapMenu: typeof TapMenuBase = ({ accessibilityLabel, children, items }) => (
    <MaterialMenu
        accessibilityLabel={accessibilityLabel}
        actions={items.map((item) => ({ id: item.id, title: item.label }))}
        onPressAction={(id) => items.find((item) => item.id === id)?.onPress()}
        renderTrigger={({ pressed }) => (
            <View
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={{ opacity: pressed ? 0.6 : 1 }}
            >
                {children}
            </View>
        )}
    />
);
