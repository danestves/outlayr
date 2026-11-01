import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { MaterialMenu } from "@/components/material-menu";
import { MonoLabel } from "@/components/mono-label";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { logScopeActions, pressLogScopeAction } from "./log-scope-actions";
import type { LogScopeMenu as LogScopeMenuBase } from "./log-scope-menu";

export const LogScopeMenu: typeof LogScopeMenuBase = (props) => {
    const t = useTranslation();
    const colors = useColors();
    return (
        <MaterialMenu
            accessibilityLabel={props.label}
            actions={logScopeActions(props, t)}
            onPressAction={(id) => pressLogScopeAction(props, id)}
            renderTrigger={({ pressed }) => (
                <View
                    className="flex-row items-center gap-1 self-start"
                    importantForAccessibility="no-hide-descendants"
                    pointerEvents="none"
                    style={{ opacity: pressed ? 0.6 : 1 }}
                >
                    <MonoLabel>{props.label}</MonoLabel>
                    <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={12} />
                </View>
            )}
        />
    );
};
