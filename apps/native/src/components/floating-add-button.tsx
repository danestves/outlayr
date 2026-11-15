import { Button, Host, Image, Menu, RNHostView, Text } from "@expo/ui/swift-ui";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Fab } from "panelui-native/components/fab";
import { useGlassMaterial } from "panelui-native/primitives/glass";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScopedVariables } from "uniwind";

import type { AddMenuRow } from "@/components/use-log-add-menu";
import { useLogAddMenu } from "@/components/use-log-add-menu";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const BOTTOM_INSET = 16;
const EDGE_INSET = 20;
const TRIGGER_SIZE = 64;
const TRIGGER_ICON_SIZE = 26;

// SwiftUI reads a second `Text` in a menu row's label as its subtitle, so the description needs no layout of ours.
function MenuRow({ row }: { row: AddMenuRow }) {
    return (
        <Button onPress={row.onPress}>
            {[
                <Text key="label">{row.label}</Text>,
                ...(row.description === undefined ? [] : [<Text key="description">{row.description}</Text>]),
                <Image key="icon" systemName={row.icon} />,
            ]}
        </Button>
    );
}

export function FloatingAddButton() {
    const { tint, accentForeground } = useColors();
    const glassDrawn = useGlassMaterial();
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const { more, rows } = useLogAddMenu();

    return (
        <Host
            ignoreSafeArea="keyboard"
            style={{
                bottom: insets.bottom + BOTTOM_INSET,
                height: TRIGGER_SIZE,
                position: "absolute",
                right: EDGE_INSET,
                width: TRIGGER_SIZE,
            }}
        >
            <Menu
                label={
                    <RNHostView matchContents>
                        {/* The menu owns the tap: a pressable in front of it would take the touch. */}
                        <View pointerEvents="none" style={{ height: TRIGGER_SIZE, width: TRIGGER_SIZE }}>
                            <ScopedVariables variables={{ "--color-primary": tint }}>
                                <Fab
                                    accessibilityLabel={t("log.add.menu")}
                                    glass
                                    icon={
                                        <HugeiconsIcon
                                            color={glassDrawn ? tint : accentForeground}
                                            icon={PlusSignIcon}
                                            size={TRIGGER_ICON_SIZE}
                                            strokeWidth={2.2}
                                        />
                                    }
                                    size="lg"
                                />
                            </ScopedVariables>
                        </View>
                    </RNHostView>
                }
            >
                {rows.map((row) => (
                    <MenuRow key={row.id} row={row} />
                ))}
                <Menu
                    label={
                        <>
                            <Text>{more.label}</Text>
                            <Text>{more.description}</Text>
                            <Image systemName={more.icon} />
                        </>
                    }
                >
                    {more.rows.map((row) => (
                        <MenuRow key={row.id} row={row} />
                    ))}
                </Menu>
            </Menu>
        </Host>
    );
}
