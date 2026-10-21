import { Circle, HStack, Rectangle, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
    containerBackground,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    minimumScaleFactor,
    padding,
    widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { PLACEHOLDERS } from "./placeholders";
import type { InsightsConfiguration, InsightsWidgetProps } from "./props";

/** Runs in the extension's `JSContext` (see `budget.tsx`). Spend only: a signed net would spike payday. */
const InsightsWidget = (props: InsightsWidgetProps, environment: WidgetEnvironment<InsightsConfiguration>) => {
    "widget";

    const scheme = environment.colorScheme === "dark" ? "dark" : "light";
    const palette = props.chrome[scheme];
    const isSmall = environment.widgetFamily === "systemSmall";
    // An older build's configuration can name a period this one no longer publishes.
    const chosen = environment.configuration?.period ?? "app";
    const view = (chosen === "app" ? undefined : props.windows[chosen]) ?? props.windows[props.defaultPeriod];

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

    // Hand-built: SwiftUI Charts draws axis chrome `@expo/ui` cannot hide.
    const peak = view.bars.reduce((max, bar) => (bar.y > max ? bar.y : max), 0);
    const bars = (height: number, showLabels: boolean) => (
        <VStack alignment="leading" spacing={4}>
            <HStack alignment="bottom" spacing={3}>
                {view.bars.map((bar, index) => (
                    <Rectangle
                        key={index}
                        modifiers={[
                            // Empty slots keep a hairline stub, so the bucket count reads.
                            frame({ height: peak > 0 ? Math.max(1, (bar.y / peak) * height) : 1 }),
                            frame({ maxWidth: Number.POSITIVE_INFINITY }),
                            foregroundStyle(bar.y > 0 ? palette.ink : palette.border),
                        ]}
                    />
                ))}
            </HStack>
            {/* Only a week is labelled: 31 labels collapse into a band. */}
            {showLabels && view.bars.length <= 7 ? (
                <HStack spacing={3}>
                    {view.bars.map((bar, index) => (
                        <Text
                            key={index}
                            modifiers={[
                                font({ design: "monospaced", size: 8, weight: "medium" }),
                                foregroundStyle(palette.muted),
                                frame({ maxWidth: Number.POSITIVE_INFINITY }),
                                lineLimit(1),
                            ]}
                        >
                            {bar.x}
                        </Text>
                    ))}
                </HStack>
            ) : null}
        </VStack>
    );

    const cell = (label: string, value: string, leading: boolean) => (
        <HStack spacing={0}>
            {leading ? null : <Rectangle modifiers={[frame({ width: 1 }), foregroundStyle(palette.border)]} />}
            <VStack
                alignment="leading"
                modifiers={[
                    frame({ alignment: "leading", maxWidth: Number.POSITIVE_INFINITY }),
                    padding({ leading: leading ? 0 : 10 }),
                ]}
                spacing={2}
            >
                {eyebrow(label)}
                <Text
                    modifiers={[
                        font({ design: "rounded", size: 13, weight: "semibold" }),
                        foregroundStyle(palette.ink),
                        lineLimit(1),
                        minimumScaleFactor(0.7),
                    ]}
                >
                    {value}
                </Text>
            </VStack>
        </HStack>
    );

    const hero = (
        <VStack alignment="leading" spacing={1}>
            {/* Period only: a date range truncates mid-range at medium width. */}
            {eyebrow(view.periodLabel)}
            <HStack alignment="firstTextBaseline" spacing={5}>
                <Text
                    modifiers={[
                        font({
                            design: "rounded",
                            size: isSmall ? 26 : 32,
                            weight: "semibold",
                        }),
                        foregroundStyle(view.netPositive ? palette.income : palette.ink),
                        lineLimit(1),
                        minimumScaleFactor(0.5),
                    ]}
                >
                    {view.netPositive ? view.net : `−${view.net}`}
                </Text>
                {eyebrow("NET")}
            </HStack>
        </VStack>
    );

    if (isSmall) {
        return (
            <VStack
                alignment="leading"
                modifiers={[widgetURL(view.url), containerBackground(palette.background, "widget")]}
                spacing={0}
            >
                {hero}
                <Spacer />
                {bars(44, true)}
            </VStack>
        );
    }

    return (
        <HStack modifiers={[widgetURL(view.url), containerBackground(palette.background, "widget")]} spacing={14}>
            <VStack alignment="leading" spacing={0}>
                {hero}
                <Spacer />
                <Rectangle modifiers={[frame({ height: 1 }), foregroundStyle(palette.border)]} />
                <Spacer modifiers={[frame({ height: 8 })]} />
                <HStack spacing={0}>
                    {cell("SPENT", view.spent, true)}
                    {cell("IN", view.income, false)}
                </HStack>
            </VStack>

            {/* No day initials: with the breakdown they overflowed. */}
            <VStack alignment="leading" spacing={8}>
                {bars(34, false)}
                {/* Its own stack: a mapped array beside a static child renders only the static child. */}
                <VStack alignment="leading" spacing={5}>
                    {view.slices.slice(0, 3).map((slice) => (
                        <HStack key={slice.name} spacing={6}>
                            <Circle modifiers={[frame({ height: 6, width: 6 }), foregroundStyle(slice.color)]} />
                            <Text
                                modifiers={[
                                    font({ design: "rounded", size: 11, weight: "medium" }),
                                    foregroundStyle(palette.ink),
                                    lineLimit(1),
                                ]}
                            >
                                {slice.name}
                            </Text>
                            <Spacer />
                            {eyebrow(`${Math.round(slice.fraction * 100)}%`)}
                        </HStack>
                    ))}
                </VStack>
            </VStack>
        </HStack>
    );
};

export default createWidget<InsightsWidgetProps, InsightsConfiguration>(
    "Insights",
    InsightsWidget,
    PLACEHOLDERS.Insights
);
