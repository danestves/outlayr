import { MenuView } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { logScopeActions, pressLogScopeAction } from "./log-scope-actions";
import type { LogScopeMenuProps } from "./log-scope-actions";

/** The eyebrow over the Log total: picks what it measures and which currency it is shown in. */
export function LogScopeMenu(props: LogScopeMenuProps) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <MenuView
            actions={logScopeActions(props, t)}
            onPressAction={({ nativeEvent }) => pressLogScopeAction(props, nativeEvent.event)}
            shouldOpenOnLongPress={false}
        >
            <View
                accessibilityLabel={props.label}
                accessibilityRole="button"
                className="flex-row items-center gap-1 self-start"
                pointerEvents="none"
            >
                <MonoLabel>{props.label}</MonoLabel>
                <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={12} />
            </View>
        </MenuView>
    );
}
