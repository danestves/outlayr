import {
    Box,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPopup,
    RNHostView,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
    createAnimatedComponent,
    interpolate,
    interpolateColor,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

import { MaterialHost } from "@/components/material-host";
import type { AddMenuRow } from "@/components/use-log-add-menu";
import { useLogAddMenu } from "@/components/use-log-add-menu";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

const AnimatedPressable = createAnimatedComponent(Pressable);

const FAB_SIZE = 56;
const FAB_CORNER = 16;
const EDGE = 16;
const ICON_SIZE = 24;
const ICON_STROKE = 1.8;
const PRESSED_ALPHA = 0.12;
const FAB_ELEVATION = 6;
const MORPH = { damping: 22, mass: 0.6, stiffness: 320 } as const;

const LABEL_STYLE = { fontFamily: "GoogleSansFlex_500Medium", fontSize: 16, lineHeight: 24 } as const;
const SUPPORTING_STYLE = { fontFamily: "GoogleSansFlex_400Regular", fontSize: 14, lineHeight: 20 } as const;

function MenuGlyph({ icon }: { icon: IconSvgElement }) {
    const m3 = useMaterialColors();
    return (
        <RNHostView matchContents>
            <View style={{ height: ICON_SIZE, width: ICON_SIZE }}>
                <HugeiconsIcon color={m3.onSurfaceVariant} icon={icon} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </View>
        </RNHostView>
    );
}

function MenuItem({
    description,
    glyph,
    label,
    onClick,
    position,
    trailing,
}: {
    description?: string;
    glyph: IconSvgElement;
    label: string;
    onClick: () => void;
    position: { count: number; index: number };
    trailing?: IconSvgElement;
}) {
    const m3 = useMaterialColors();
    return (
        <DropdownMenuItem
            elementColors={{ textColor: m3.onSurface }}
            onClick={onClick}
            // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- @expo/ui's prop that turns on the Material 3 Expressive item
            shape={position}
        >
            <DropdownMenuItem.Text>
                <ComposeText style={LABEL_STYLE}>{label}</ComposeText>
            </DropdownMenuItem.Text>
            {description === undefined ? null : (
                <DropdownMenuItem.SupportingText>
                    <ComposeText color={m3.onSurfaceVariant} style={SUPPORTING_STYLE}>
                        {description}
                    </ComposeText>
                </DropdownMenuItem.SupportingText>
            )}
            <DropdownMenuItem.LeadingIcon>
                <MenuGlyph icon={glyph} />
            </DropdownMenuItem.LeadingIcon>
            {trailing === undefined ? null : (
                <DropdownMenuItem.TrailingIcon>
                    <MenuGlyph icon={trailing} />
                </DropdownMenuItem.TrailingIcon>
            )}
        </DropdownMenuItem>
    );
}

export function FloatingAddButton() {
    const m3 = useMaterialColors();
    const t = useTranslation();
    const haptics = useHaptics();
    const { more, rows } = useLogAddMenu();
    const [open, setOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const progress = useSharedValue(0);

    const close = () => {
        setMoreOpen(false);
        setOpen(false);
    };

    useFocusEffect(() => close);

    useAnimatedReaction(
        () => open,
        (expanded) => {
            progress.set(withSpring(expanded ? 1 : 0, MORPH));
        }
    );

    const choose = (row: AddMenuRow) => {
        close();
        row.onPress();
    };

    // The dropdown opens above the button, so the row nearest the + is the last one drawn.
    const nearestLast = [...rows].reverse();
    const count = nearestLast.length + 1;

    const fabStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(progress.get(), [0, 1], [m3.primaryContainer, m3.primary]),
        borderRadius: interpolate(progress.get(), [0, 1], [FAB_CORNER, FAB_SIZE / 2]),
    }));
    const plusStyle = useAnimatedStyle(() => ({
        opacity: 1 - progress.get(),
        transform: [{ rotate: `${progress.get() * 90}deg` }],
    }));
    const closeStyle = useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ rotate: `${(progress.get() - 1) * 90}deg` }],
    }));

    return (
        <MaterialHost matchContents style={{ bottom: EDGE, position: "absolute", right: EDGE }}>
            <Box>
                <RNHostView matchContents>
                    <AnimatedPressable
                        accessibilityLabel={t("log.add.menu")}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        android_ripple={{ color: withAlpha(m3.onPrimaryContainer, PRESSED_ALPHA) }}
                        className="items-center justify-center overflow-hidden"
                        onPress={() => {
                            haptics("selection");
                            setOpen(!open);
                        }}
                        style={[{ elevation: FAB_ELEVATION, height: FAB_SIZE, width: FAB_SIZE }, fabStyle]}
                    >
                        <Animated.View className="absolute" style={plusStyle}>
                            <HugeiconsIcon
                                color={m3.onPrimaryContainer}
                                icon={PlusSignIcon}
                                size={ICON_SIZE}
                                strokeWidth={ICON_STROKE}
                            />
                        </Animated.View>
                        <Animated.View className="absolute" style={closeStyle}>
                            <HugeiconsIcon
                                color={m3.onPrimary}
                                icon={Cancel01Icon}
                                size={ICON_SIZE}
                                strokeWidth={ICON_STROKE}
                            />
                        </Animated.View>
                    </AnimatedPressable>
                </RNHostView>
                <DropdownMenuPopup anchorPosition="above" expanded={open} onDismissRequest={close}>
                    <DropdownMenuGroup>
                        <Box>
                            <MenuItem
                                description={more.description}
                                glyph={more.glyph}
                                label={more.label}
                                onClick={() => setMoreOpen(true)}
                                position={{ count, index: 0 }}
                                trailing={ArrowRight01Icon}
                            />
                            <DropdownMenuPopup
                                anchorPosition="start"
                                expanded={moreOpen}
                                onDismissRequest={() => setMoreOpen(false)}
                            >
                                <DropdownMenuGroup>
                                    {more.rows.map((row, index) => (
                                        <MenuItem
                                            glyph={row.glyph}
                                            key={row.id}
                                            label={row.label}
                                            onClick={() => choose(row)}
                                            position={{ count: more.rows.length, index }}
                                        />
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuPopup>
                        </Box>
                        {nearestLast.map((row, index) => (
                            <MenuItem
                                description={row.description}
                                glyph={row.glyph}
                                key={row.id}
                                label={row.label}
                                onClick={() => choose(row)}
                                position={{ count, index: index + 1 }}
                            />
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuPopup>
            </Box>
        </MaterialHost>
    );
}
