import { Gauge, HStack, ProgressView, Rectangle, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
    containerBackground,
    font,
    foregroundStyle,
    frame,
    gaugeStyle,
    lineLimit,
    minimumScaleFactor,
    padding,
    progressViewStyle,
    tint,
    widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import { PLACEHOLDERS } from "./placeholders";
import type { BudgetConfiguration, BudgetWidgetProps } from "./props";

/**
 * Runs in the extension's own `JSContext`: only `props`, `environment`, `@expo/ui` globals and locals exist. No outer
 * padding: WidgetKit already insets by the system margins.
 */
const BudgetWidget = (props: BudgetWidgetProps, environment: WidgetEnvironment<BudgetConfiguration>) => {
    "widget";

    const scheme = environment.colorScheme === "dark" ? "dark" : "light";
    const palette = props.chrome[scheme];
    const family = environment.widgetFamily;
    // An older build's configuration can name a view this one no longer publishes.
    const view = props.views[environment.configuration?.budget ?? "auto"] ?? props.views.auto;
    const accent = view.over ? palette.over : palette.ink;

    // Lock Screen families flatten to one tint, so the copy carries the meaning.
    const isAccessory =
        family === "accessoryCircular" || family === "accessoryRectangular" || family === "accessoryInline";

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
        return (
            <Text modifiers={[widgetURL(view.url)]}>
                {view.present
                    ? `${view.isOverall ? "" : `${view.name}: `}${view.remaining} ${view.remainingCaption.toLowerCase()} · ${view.percent}`
                    : "No budget yet"}
            </Text>
        );
    }

    if (family === "accessoryCircular") {
        return (
            <Gauge
                max={1}
                min={0}
                modifiers={[gaugeStyle("circularCapacity"), widgetURL(view.url)]}
                value={view.spentFraction}
            >
                <Text>{view.present ? view.percent : "—"}</Text>
            </Gauge>
        );
    }

    if (!view.present) {
        return (
            <VStack modifiers={[widgetURL(view.url), containerBackground(palette.background, "widget")]} spacing={4}>
                {eyebrow("BUDGET")}
                <Text
                    modifiers={[
                        font({ design: "rounded", size: 15, weight: "medium" }),
                        foregroundStyle(palette.muted),
                    ]}
                >
                    Set a budget to see it here.
                </Text>
            </VStack>
        );
    }

    // `minimumScaleFactor`: the hero must hold "$9.20" and "$12,480" alike.
    const hero = (size: number) => (
        <HStack alignment="firstTextBaseline" spacing={5}>
            <Text
                modifiers={[
                    font({ design: "rounded", size, weight: "semibold" }),
                    foregroundStyle(isAccessory ? palette.ink : accent),
                    lineLimit(1),
                    minimumScaleFactor(0.5),
                ]}
            >
                {view.remaining}
            </Text>
            <Text
                modifiers={[
                    font({ design: "monospaced", size: 10, weight: "medium" }),
                    foregroundStyle(palette.muted),
                    lineLimit(1),
                ]}
            >
                {view.remainingCaption}
            </Text>
        </HStack>
    );

    const rail = <ProgressView modifiers={[progressViewStyle("linear"), tint(accent)]} value={view.spentFraction} />;

    if (family === "accessoryRectangular") {
        return (
            <VStack alignment="leading" modifiers={[widgetURL(view.url)]} spacing={2}>
                {eyebrow(
                    view.isOverall
                        ? `${view.periodLabel} · ${view.percent}`
                        : `${view.name.toUpperCase()} · ${view.percent}`
                )}
                {hero(20)}
                {rail}
            </VStack>
        );
    }

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

    const overallHeading = family === "systemSmall" ? view.periodLabel : `${view.periodLabel} · ${view.rangeLabel}`;
    const heading = view.isOverall ? overallHeading : `${view.name.toUpperCase()} · ${view.periodLabel}`;

    return (
        <VStack
            alignment="leading"
            modifiers={[widgetURL(view.url), containerBackground(palette.background, "widget")]}
            spacing={0}
        >
            {eyebrow(heading)}
            <Spacer modifiers={[frame({ height: 6 })]} />
            {hero(family === "systemSmall" ? 26 : 32)}
            <Spacer modifiers={[frame({ height: 10 })]} />
            {rail}
            <Spacer />
            <Rectangle modifiers={[frame({ height: 1 }), foregroundStyle(palette.border)]} />
            <Spacer modifiers={[frame({ height: 8 })]} />
            <HStack spacing={0}>
                {cell("SPENT", view.spent, true)}
                {cell("LIMIT", view.limit, false)}
                {family === "systemSmall" ? null : cell("ELAPSED", `${Math.round(view.elapsedFraction * 100)}%`, false)}
            </HStack>
        </VStack>
    );
};

export default createWidget<BudgetWidgetProps, BudgetConfiguration>("Budget", BudgetWidget, PLACEHOLDERS.Budget);
