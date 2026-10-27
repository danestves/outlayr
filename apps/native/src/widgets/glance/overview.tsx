import { Box, Button, Column, Image, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
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

import type { OverviewCopy, WidgetEnvelope } from "./envelope";
import { ANDROID_PLACEHOLDERS } from "./placeholders";

const OverviewWidget = (snapshot: WidgetEnvelope<OverviewCopy>, environment: WidgetEnvironment) => {
    "widget";

    const [language = "en", region = ""] = (environment.locale ?? "en").split("-");
    const byTag: Partial<Record<string, OverviewCopy>> = snapshot.locales;
    const props = byTag[`${language}-${region}`] ?? byTag[language] ?? snapshot.locales.en;
    const { palette } = snapshot;
    const widgetWidth = environment.width ?? 340;
    const widgetHeight = environment.height ?? 150;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const hidden = snapshot.hidden ?? true;
    const stacked = widgetHeight >= 270;
    const stat = stacked ? inner : Math.floor((inner - 20) / 3);
    const buttons = props.actions.length;
    const button = Math.floor((inner - 6 * (buttons - 1)) / buttons);
    const labelled = button >= 84;
    const buttonHeight = widgetHeight >= 140 ? 44 : 38;
    const largest = widgetHeight >= 180 ? 28 : 20;
    const fit = (text: string) => Math.max(12, Math.min(largest, Math.floor(stat / (text.length * 0.62))));

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

    const balanceStat = (
        <Column modifiers={[width(stat)]}>
            <Row verticalAlignment="center">
                {caption(props.balanceLabel)}
                <Button {...{ target: "eye" }} onClick={() => ({ hidden: !hidden })} modifiers={[size(22, 16)]}>
                    <Image
                        source={{ uri: hidden ? "widget_eye_off" : "widget_eye" }}
                        contentDescription={hidden ? props.showLabel : props.hideLabel}
                        tint={palette.muted}
                        modifiers={[size(14, 14)]}
                    />
                </Button>
            </Row>
            {figure(balance, palette.ink)}
        </Column>
    );

    const todayStat = (
        <Column modifiers={[width(stat)]}>
            {caption(props.today.label)}
            {figure(props.today.spent, palette.ink)}
        </Column>
    );

    const budgetStat = (
        <Column modifiers={[width(stat)]}>
            {caption(props.budget.label)}
            {props.budget.present ? (
                <Column>
                    {figure(props.budget.left, props.budget.over ? palette.over : palette.ink)}
                    <Spacer modifiers={[height(2)]} />
                    <Box modifiers={[size(stat, 10)]}>
                        <Box contentAlignment="centerStart" modifiers={[fillMaxSize()]}>
                            <Box modifiers={[size(stat, 4), cornerRadius(2), background(palette.border)]}>
                                <Box
                                    modifiers={[
                                        size(Math.max(4, Math.round(stat * props.budget.fraction)), 4),
                                        cornerRadius(2),
                                        background(props.budget.over ? palette.over : palette.ink),
                                    ]}
                                />
                            </Box>
                        </Box>
                        <Box contentAlignment="centerStart" modifiers={[fillMaxSize()]}>
                            <Row>
                                <Spacer
                                    modifiers={[
                                        width(
                                            Math.max(0, Math.min(stat - 2, Math.round(stat * props.budget.pace) - 1))
                                        ),
                                    ]}
                                />
                                <Box modifiers={[size(2, 10), cornerRadius(1), background(palette.muted)]} />
                            </Row>
                        </Box>
                    </Box>
                    {widgetHeight >= 140 ? (
                        <Text color={palette.muted} maxLines={1} style={{ fontSize: 10 }}>
                            {props.budget.timeLeft}
                        </Text>
                    ) : null}
                </Column>
            ) : null}
        </Column>
    );

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                {stacked ? (
                    <Column>
                        {balanceStat}
                        <Spacer modifiers={[height(10)]} />
                        {todayStat}
                        <Spacer modifiers={[height(10)]} />
                        {budgetStat}
                    </Column>
                ) : (
                    <Row>
                        {balanceStat}
                        <Spacer modifiers={[width(10)]} />
                        {todayStat}
                        <Spacer modifiers={[width(10)]} />
                        {budgetStat}
                    </Row>
                )}
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

export default createWidget<WidgetEnvelope<OverviewCopy>>("Overview", OverviewWidget, ANDROID_PLACEHOLDERS.Overview);
