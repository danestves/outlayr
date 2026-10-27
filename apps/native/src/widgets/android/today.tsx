import { Box, Button, Column, Image, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, paddingAll, size, width } from "@expo/ui/jetpack-compose/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { ANDROID_PLACEHOLDERS } from "./placeholders";
import type { TodayWidgetProps } from "./props";

/** Same runtime limits as `wallet.tsx`: helpers inside, widths from the patched environment. */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const palette = props.chrome[environment.colorScheme === "dark" ? "dark" : "light"];
    const widgetWidth = environment.width ?? 170;
    const widgetHeight = environment.height ?? 170;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const count = props.actions.length;
    const circle = Math.max(34, Math.min(48, Math.floor((inner - 8 * (count - 1)) / count)));
    const gap = Math.max(4, Math.floor((inner - circle * count) / (count - 1)));
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
                                modifiers={[size(circle, circle), cornerRadius(circle / 2), background(palette.ink)]}
                            >
                                <Image
                                    source={{ uri: action.icon }}
                                    contentDescription={action.label}
                                    tint={palette.background}
                                    modifiers={[size(20, 20)]}
                                />
                            </Button>
                        </Row>
                    ))}
                </Row>
            </Box>
        </Box>
    );
};

export default createWidget<TodayWidgetProps>("Today", TodayWidget, ANDROID_PLACEHOLDERS.Today);
