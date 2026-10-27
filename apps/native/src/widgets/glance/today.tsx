import { Box, Button, Column, Image, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, paddingAll, size, width } from "@expo/ui/jetpack-compose/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import type { TodayCopy, WidgetEnvelope } from "./envelope";
import { ANDROID_PLACEHOLDERS } from "./placeholders";

const TodayWidget = (snapshot: WidgetEnvelope<TodayCopy>, environment: WidgetEnvironment) => {
    "widget";

    const [language = "en", region = ""] = (environment.locale ?? "en").split("-");
    const byTag: Partial<Record<string, TodayCopy>> = snapshot.locales;
    const props = byTag[`${language}-${region}`] ?? byTag[language] ?? snapshot.locales.en;
    const { palette } = snapshot;
    const widgetWidth = environment.width ?? 170;
    const widgetHeight = environment.height ?? 170;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const count = props.actions.length;
    const circle = Math.max(34, Math.min(48, Math.floor((inner - 8 * (count - 1)) / count)));
    const wide = widgetWidth >= 300;
    const gap = wide ? 8 : Math.max(4, Math.floor((inner - circle * count) / (count - 1)));
    const buttonWidth = wide ? Math.floor((inner - gap * (count - 1)) / count) : circle;
    const largest = widgetHeight >= 200 ? 34 : 28;
    const fontSize = Math.max(16, Math.min(largest, Math.floor(inner / (props.spent.length * 0.62))));

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                <Column>
                    <Text color={palette.muted} maxLines={1} style={{ fontSize: 12 }}>
                        {props.label}
                    </Text>
                    <Text color={palette.ink} maxLines={1} style={{ fontSize, fontWeight: "500" }}>
                        {props.spent}
                    </Text>
                    <Text color={palette.muted} maxLines={1} style={{ fontSize: 11 }}>
                        {props.count}
                    </Text>
                </Column>
            </Box>
            <Box contentAlignment="bottomStart" modifiers={[fillMaxSize()]}>
                <Row verticalAlignment="center">
                    {props.actions.map((action, index) => (
                        <Row key={action.icon}>
                            {index > 0 ? <Spacer modifiers={[width(gap)]} /> : null}
                            <Button
                                {...{ target: action.url }}
                                modifiers={[
                                    size(buttonWidth, circle),
                                    cornerRadius(circle / 2),
                                    background(palette.ink),
                                ]}
                            >
                                <Row verticalAlignment="center">
                                    <Image
                                        source={{ uri: action.icon }}
                                        contentDescription={action.label}
                                        tint={palette.background}
                                        modifiers={[size(20, 20)]}
                                    />
                                    {wide ? <Spacer modifiers={[width(6)]} /> : null}
                                    {wide ? (
                                        <Text color={palette.background} maxLines={1} style={{ fontSize: 13 }}>
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

export default createWidget<WidgetEnvelope<TodayCopy>>("Today", TodayWidget, ANDROID_PLACEHOLDERS.Today);
