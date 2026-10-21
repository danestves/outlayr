import type { MenuAction } from "@expo/ui/community/menu";
import {
    DropdownMenu,
    DropdownMenuItem,
    HorizontalDivider,
    Icon,
    RNHostView,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import { MaterialHost } from "@/components/material-host";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { MaterialMenuProps } from "./material-menu";

export type { MaterialMenuProps } from "./material-menu";

// Only the SF Symbols the chip menus name; anything else, or an image source, draws no icon.
const SYMBOL_ICONS = new Map<MenuAction["image"], ImageSourcePropType>([
    ["arrow.uturn.backward", { uri: "nano_now" }],
    ["chevron.left", { uri: "nano_earlier" }],
    ["chevron.right", { uri: "nano_later" }],
]);

const LABEL_STYLE = { fontFamily: "GoogleSansFlex_500Medium", fontSize: 14, lineHeight: 20 } as const;

const ICON_SIZE = 24;
const PRESSED_ALPHA = 0.1;
/** dp. */
const MIN_TOUCH = 48;

function actionId(action: MenuAction): string {
    return action.id ?? action.title;
}

function MenuRow({ action, onChoose }: { action: MenuAction; onChoose: (id: string) => void }) {
    const m3 = useMaterialColors();
    const icon = SYMBOL_ICONS.get(action.image);
    const selected = action.state === "on";
    return (
        <DropdownMenuItem
            elementColors={{
                leadingIconColor: m3.onSurfaceVariant,
                textColor: m3.onSurface,
                trailingIconColor: m3.primary,
            }}
            enabled={action.attributes?.disabled !== true}
            onClick={() => onChoose(actionId(action))}
        >
            <DropdownMenuItem.Text>
                <ComposeText style={LABEL_STYLE}>{action.title}</ComposeText>
            </DropdownMenuItem.Text>
            {icon ? (
                <DropdownMenuItem.LeadingIcon>
                    <Icon size={ICON_SIZE} source={icon} />
                </DropdownMenuItem.LeadingIcon>
            ) : null}
            {selected ? (
                <DropdownMenuItem.TrailingIcon>
                    <Icon size={ICON_SIZE} source={{ uri: "nano_done" }} />
                </DropdownMenuItem.TrailingIcon>
            ) : null}
        </DropdownMenuItem>
    );
}

// Re-hosted in `MaterialHost`: the community `MenuView` renders a bare `Host`, taking the wallpaper's palette and
// the system face. A trigger under 48dp grows its host by the difference and gives it back as negative margin.
export function MaterialMenu({
    accessibilityLabel,
    accessibilityValue,
    actions,
    children,
    onPressAction,
    renderTrigger,
}: MaterialMenuProps) {
    const m3 = useMaterialColors();
    const [expanded, setExpanded] = useState(false);
    const [height, setHeight] = useState<number | null>(null);
    const slop = height === null ? 0 : Math.max(0, (MIN_TOUCH - height) / 2);
    const choose = (id: string) => {
        setExpanded(false);
        onPressAction(id);
    };

    return (
        <MaterialHost matchContents style={{ marginVertical: -slop }}>
            <DropdownMenu color={m3.surfaceContainer} expanded={expanded} onDismissRequest={() => setExpanded(false)}>
                <DropdownMenu.Trigger>
                    <RNHostView matchContents>
                        <Pressable
                            accessibilityLabel={accessibilityLabel}
                            accessibilityRole="button"
                            accessibilityState={{ expanded }}
                            accessibilityValue={accessibilityValue}
                            android_ripple={
                                renderTrigger ? undefined : { color: withAlpha(m3.onSurface, PRESSED_ALPHA) }
                            }
                            onPress={() => setExpanded(true)}
                            style={{ paddingVertical: slop }}
                        >
                            {({ pressed }) => (
                                <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
                                    {renderTrigger ? renderTrigger({ pressed }) : children}
                                </View>
                            )}
                        </Pressable>
                    </RNHostView>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                    {actions
                        .filter((action) => action.attributes?.hidden !== true)
                        .flatMap((action, index) => {
                            const rows = action.subactions?.length ? action.subactions : [action];
                            const divider =
                                index > 0 && action.subactions?.length ? (
                                    <HorizontalDivider color={m3.outlineVariant} key={`${actionId(action)}-divider`} />
                                ) : null;
                            return [
                                divider,
                                ...rows
                                    .filter((row) => row.attributes?.hidden !== true)
                                    .map((row) => <MenuRow action={row} key={actionId(row)} onChoose={choose} />),
                            ];
                        })}
                </DropdownMenu.Items>
            </DropdownMenu>
        </MaterialHost>
    );
}
