import { Box, Button, Column, Image, LinearProgressIndicator, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import {
    background,
    cornerRadius,
    fillMaxSize,
    height,
    paddingAll,
    size,
    width,
} from "@expo/ui/jetpack-compose/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { ANDROID_PLACEHOLDERS } from "./placeholders";
import type { OverviewWidgetProps } from "./props";

/** Same runtime limits as `wallet.tsx`: helpers inside, widths from the patched environment. */
const OverviewWidget = (props: OverviewWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const palette = props.chrome[environment.colorScheme === "dark" ? "dark" : "light"];
    const widgetWidth = environment.width ?? 340;
    const widgetHeight = environment.height ?? 150;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const hidden = props.hidden ?? true;
    const stat = Math.floor((inner - 20) / 3);
    const buttons = props.actions.length;
    const button = Math.floor((inner - 6 * (buttons - 1)) / buttons);
    const labelled = button >= 84;
    const buttonHeight = widgetHeight >= 140 ? 44 : 38;
    const fit = (text: string) => Math.max(12, Math.min(20, Math.floor(stat / (text.length * 0.62))));

    const caption = (text: string) => (
        <Text color={palette.muted} maxLines={1} style={{ fontSize: 11 }}>
            {text}
        </Text>
    );

    const figure = (text: string, color: string) => (
        <Text color={color} maxLines={1} style={{ fontSize: fit(text), fontWeight: "500" }}>
            {text}
        </Text>
    );

    const balance = hidden ? props.mask : props.balance;

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                <Row>
                    <Column modifiers={[width(stat)]}>
                        <Row verticalAlignment="center">
                            {caption(props.balanceLabel)}
                            <Button
                                {...{ target: "eye" }}
                                onClick={() => ({ hidden: !hidden })}
                                modifiers={[size(22, 16)]}
                            >
                                <Image
                                    source={{ uri: hidden ? "widget_eye_off" : "widget_eye" }}
                                    tint={palette.muted}
                                    modifiers={[size(14, 14)]}
                                />
                            </Button>
                        </Row>
                        {figure(balance, palette.ink)}
                    </Column>
                    <Spacer modifiers={[width(10)]} />
                    <Column modifiers={[width(stat)]}>
                        {caption(props.today.label)}
                        {figure(props.today.spent, palette.ink)}
                    </Column>
                    <Spacer modifiers={[width(10)]} />
                    <Column modifiers={[width(stat)]}>
                        {caption(props.budget.label)}
                        {props.budget.present ? (
                            <Column>
                                {figure(props.budget.left, props.budget.over ? palette.over : palette.ink)}
                                <Spacer modifiers={[height(4)]} />
                                <LinearProgressIndicator
                                    progress={props.budget.fraction}
                                    color={props.budget.over ? palette.over : palette.ink}
                                    trackColor={palette.border}
                                    modifiers={[size(stat, 4)]}
                                />
                            </Column>
                        ) : null}
                    </Column>
                </Row>
            </Box>
            <Box contentAlignment="bottomStart" modifiers={[fillMaxSize()]}>
                <Row verticalAlignment="center">
                    {props.actions.map((action, index) => (
                        <Row key={action.icon}>
                            {index > 0 ? <Spacer modifiers={[width(6)]} /> : null}
                            <Button
                                {...{ target: action.url }}
                                modifiers={[size(button, buttonHeight), cornerRadius(14), background(palette.border)]}
                            >
                                <Row verticalAlignment="center">
                                    <Image
                                        source={{ uri: action.icon }}
                                        contentDescription={action.label}
                                        tint={palette.ink}
                                        modifiers={[size(16, 16)]}
                                    />
                                    {labelled ? <Spacer modifiers={[width(6)]} /> : null}
                                    {labelled ? (
                                        <Text color={palette.ink} maxLines={1} style={{ fontSize: 12 }}>
                                            {action.label}
                                        </Text>
                                    ) : null}
                                </Row>
                            </Button>
                        </Row>
                    ))}
                </Row>
            </Box>
        </Box>
    );
};

export default createWidget<OverviewWidgetProps>("Overview", OverviewWidget, ANDROID_PLACEHOLDERS.Overview);
