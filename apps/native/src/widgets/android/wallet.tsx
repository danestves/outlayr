import { Box, Button, Column, Image, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, paddingAll, size, width } from "@expo/ui/jetpack-compose/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { ANDROID_PLACEHOLDERS } from "./placeholders";
import type { WalletWidgetProps } from "./props";

/**
 * Runs in the widget's own Hermes runtime, so every helper lives inside. Glance has no `weight`, so widths come from
 * the patched `environment.width` and `height`. `target` is spread in: `expo-widgets` reads it, `ButtonProps` omits it.
 */
const WalletWidget = (props: WalletWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const palette = props.chrome[environment.colorScheme === "dark" ? "dark" : "light"];
    const widgetWidth = environment.width ?? 340;
    const widgetHeight = environment.height ?? 150;
    const pad = 12;
    const hidden = props.hidden ?? true;
    const figure = hidden ? props.mask : props.balance;
    const sideBySide = widgetWidth >= 330;
    const column = 60;
    const circle = widgetHeight >= 120 ? 44 : 38;
    const panel = column * props.actions.length + 16;
    const room = sideBySide ? widgetWidth - pad * 2 - panel - 10 : widgetWidth - pad * 2 - 36;
    const fontSize = Math.max(14, Math.min(26, Math.floor(room / (figure.length * 0.62))));

    const brand = (
        <Row verticalAlignment="center">
            <Image source={{ uri: "widget_logo" }} tint={palette.ink} modifiers={[size(18, 18)]} />
            <Spacer modifiers={[width(6)]} />
            <Text color={palette.ink} maxLines={1} style={{ fontSize: 15, fontWeight: "bold" }}>
                outlayr
            </Text>
        </Row>
    );

    const amount = (
        <Column>
            <Text color={palette.muted} maxLines={1} style={{ fontSize: 12 }}>
                {props.balanceLabel}
            </Text>
            <Row verticalAlignment="center">
                <Text color={palette.ink} maxLines={1} style={{ fontSize, fontWeight: "500" }}>
                    {figure}
                </Text>
                <Spacer modifiers={[width(4)]} />
                <Button
                    {...{ target: "eye" }}
                    onClick={() => ({ hidden: !hidden })}
                    modifiers={[size(32, 32), cornerRadius(16)]}
                >
                    <Image
                        source={{ uri: hidden ? "widget_eye_off" : "widget_eye" }}
                        tint={palette.muted}
                        modifiers={[size(18, 18)]}
                    />
                </Button>
            </Row>
        </Column>
    );

    const actions = (
        <Row verticalAlignment="center">
            {props.actions.map((action) => (
                <Button key={action.icon} {...{ target: action.url }} modifiers={[width(column)]}>
                    <Column horizontalAlignment="center">
                        <Box
                            contentAlignment="center"
                            modifiers={[size(circle, circle), cornerRadius(circle / 2), background(palette.ink)]}
                        >
                            <Image
                                source={{ uri: action.icon }}
                                tint={palette.background}
                                modifiers={[size(20, 20)]}
                            />
                        </Box>
                        <Spacer modifiers={[size(1, 4)]} />
                        <Text color={palette.ink} maxLines={1} style={{ fontSize: 11 }}>
                            {action.label}
                        </Text>
                    </Column>
                </Button>
            ))}
        </Row>
    );

    if (sideBySide) {
        return (
            <Row
                verticalAlignment="center"
                modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}
            >
                <Box modifiers={[width(room), fillMaxSize()]}>
                    <Box contentAlignment="topStart" modifiers={[fillMaxSize(), paddingAll(4)]}>
                        {brand}
                    </Box>
                    <Box contentAlignment="bottomStart" modifiers={[fillMaxSize(), paddingAll(4)]}>
                        {amount}
                    </Box>
                </Box>
                <Spacer modifiers={[width(10)]} />
                <Box
                    contentAlignment="center"
                    modifiers={[width(panel), fillMaxSize(), cornerRadius(18), background(palette.border)]}
                >
                    {actions}
                </Box>
            </Row>
        );
    }

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                {amount}
            </Box>
            <Box contentAlignment="bottomCenter" modifiers={[fillMaxSize()]}>
                {actions}
            </Box>
        </Box>
    );
};

export default createWidget<WalletWidgetProps>("Wallet", WalletWidget, ANDROID_PLACEHOLDERS.Wallet);
