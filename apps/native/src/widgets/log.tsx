import { Circle, HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    minimumScaleFactor,
    widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { PLACEHOLDERS } from "./placeholders";
import type { LogWidgetProps } from "./props";

/** Runs in the extension's `JSContext` (see `budget.tsx`). One `widgetURL`, so the tile is one target. */
const LogWidget = (props: LogWidgetProps, environment: WidgetEnvironment) => {
    "widget";

    const scheme = environment.colorScheme === "dark" ? "dark" : "light";
    const palette = props.chrome[scheme];
    const family = environment.widgetFamily;

    const eyebrow = (value: string) => (
        <Text
            modifiers={[
                font({ design: "monospaced", size: 10, weight: "medium" }),
                foregroundStyle(palette.muted),
                lineLimit(1),
            ]}
        >
            {value}
        </Text>
    );

    if (family === "accessoryInline") {
        return <Text modifiers={[widgetURL(props.url)]}>{`Log an expense · ${props.todaySpent} today`}</Text>;
    }

    // Accessory families flatten to one tint, so the plus stands alone.
    if (family === "accessoryCircular") {
        return <Image modifiers={[font({ size: 22, weight: "semibold" }), widgetURL(props.url)]} systemName="plus" />;
    }

    if (family === "accessoryRectangular") {
        return (
            <VStack alignment="leading" modifiers={[widgetURL(props.url)]} spacing={2}>
                {eyebrow(`${props.todayLabel} · TAP TO LOG`)}
                <Text
                    modifiers={[
                        font({ design: "rounded", size: 20, weight: "semibold" }),
                        lineLimit(1),
                        minimumScaleFactor(0.5),
                    ]}
                >
                    {props.todaySpent}
                </Text>
            </VStack>
        );
    }

    // Matches the app's own `FloatingAddButton`.
    const plus = (size: number) => (
        <ZStack modifiers={[frame({ height: size, width: size })]}>
            <Circle modifiers={[foregroundStyle(palette.ink)]} />
            <Image
                modifiers={[font({ size: size * 0.5, weight: "semibold" }), foregroundStyle(palette.background)]}
                systemName="plus"
            />
        </ZStack>
    );

    return (
        <VStack
            alignment="leading"
            modifiers={[widgetURL(props.url), containerBackground(palette.background, "widget")]}
            spacing={0}
        >
            {eyebrow(props.todayLabel)}
            <Spacer modifiers={[frame({ height: 6 })]} />
            <HStack alignment="firstTextBaseline" spacing={5}>
                <Text
                    modifiers={[
                        font({ design: "rounded", size: 26, weight: "semibold" }),
                        foregroundStyle(palette.ink),
                        lineLimit(1),
                        minimumScaleFactor(0.5),
                    ]}
                >
                    {props.todaySpent}
                </Text>
                {eyebrow("OUT")}
            </HStack>
            <Spacer />
            <Rectangle modifiers={[frame({ height: 1 }), foregroundStyle(palette.border)]} />
            <Spacer modifiers={[frame({ height: 10 })]} />
            <HStack spacing={8}>
                {plus(28)}
                {eyebrow("LOG EXPENSE")}
                <Spacer />
            </HStack>
        </VStack>
    );
};

export default createWidget<LogWidgetProps>("Log", LogWidget, PLACEHOLDERS.Log);
