import { View } from "react-native";

import { MaterialMenu } from "@/components/material-menu";

import type { LogHeadMenu as LogHeadMenuBase } from "./log-head-menu";
import { LogHeadMenuLabel } from "./log-head-menu-label";

export const LogHeadMenu: typeof LogHeadMenuBase = ({ actions, label, onPressAction }) => (
    <MaterialMenu
        accessibilityLabel={label}
        actions={actions}
        onPressAction={onPressAction}
        renderTrigger={({ pressed }) => (
            <View
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={{ opacity: pressed ? 0.6 : 1 }}
            >
                <LogHeadMenuLabel label={label} />
            </View>
        )}
    />
);
