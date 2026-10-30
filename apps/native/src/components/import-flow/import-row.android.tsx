import { Icon, Switch } from "@expo/ui/jetpack-compose";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { ListItemFrame, ListItemText } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { MONO_LABEL_CLASS } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";

import type { ImportRow as IosImportRow, TargetTone } from "./import-row";

const HOW_TONE: Record<TargetTone, string> = {
    matched: "text-income",
    nested: "text-m3-primary",
    quiet: "text-m3-on-surface-variant",
};

/** The switch has no handler of its own: the row takes the tap, as in `ToggleRow`. */
export function ImportRow({
    detail,
    leading,
    onPress,
    target,
    testID,
    title,
    toggle,
    value,
}: ComponentProps<typeof IosImportRow>) {
    const press = toggle ? () => toggle.onValueChange(!toggle.value) : onPress;
    return (
        <ListItemFrame
            accessibilityLabel={[title, detail, target?.label].filter(Boolean).join(", ")}
            accessibilityRole={toggle ? "switch" : "button"}
            accessibilityState={toggle ? { checked: toggle.value } : undefined}
            onPress={press}
            testID={testID}
            twoLine={Boolean(detail)}
        >
            {leading}
            <View className="flex-1">
                <ListItemText supporting={[detail]} title={title} />
            </View>
            {value ? <Text className="text-body text-m3-on-surface tabular-nums">{value}</Text> : null}
            {target ? (
                <View className="max-w-[45%] items-end gap-0.5">
                    <Text
                        className={cn(
                            "text-caption",
                            target.loud ? "font-sans-semibold text-m3-on-surface" : "text-m3-on-surface-variant"
                        )}
                        numberOfLines={1}
                    >
                        {target.label}
                    </Text>
                    {target.how ? (
                        <Text className={cn(MONO_LABEL_CLASS, HOW_TONE[target.tone ?? "quiet"])} numberOfLines={1}>
                            {target.how}
                        </Text>
                    ) : null}
                </View>
            ) : null}
            {toggle ? (
                <View importantForAccessibility="no-hide-descendants">
                    <MaterialHost matchContents>
                        <Switch value={toggle.value}>
                            {toggle.value ? (
                                <Switch.ThumbContent>
                                    <Icon size={Switch.DefaultIconSize} source={{ uri: "nano_done" }} />
                                </Switch.ThumbContent>
                            ) : null}
                        </Switch>
                    </MaterialHost>
                </View>
            ) : null}
        </ListItemFrame>
    );
}
