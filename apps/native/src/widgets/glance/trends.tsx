import { Box, Button, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
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

import type { TrendsConfiguration, TrendsCopy, WidgetEnvelope } from "./envelope";
import { ANDROID_PLACEHOLDERS } from "./placeholders";

const TrendsWidget = (snapshot: WidgetEnvelope<TrendsCopy>, environment: WidgetEnvironment<TrendsConfiguration>) => {
    "widget";

    const [language = "en", region = ""] = (environment.locale ?? "en").split("-");
    const byTag: Partial<Record<string, TrendsCopy>> = snapshot.locales;
    const props = byTag[`${language}-${region}`] ?? byTag[language] ?? snapshot.locales.en;
    const { palette } = snapshot;
    const widgetWidth = environment.width ?? 170;
    const widgetHeight = environment.height ?? 170;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const tall = widgetHeight - pad * 2;
    const selection = environment.configuration?.period ?? "app";
    const view = props.windows[selection === "app" ? props.defaultPeriod : selection] ?? props.windows.week;
    const wide = widgetWidth >= 250;
    const columnGap = 14;
    const column = wide ? Math.floor((inner - columnGap) / 2) : inner;
    const heroSize = wide ? 32 : 26;
    const fit = (text: string, largest: number) =>
        Math.max(14, Math.min(largest, Math.floor(column / (text.length * 0.6))));

    const caption = (text: string) => (
        <Text color={palette.muted} maxLines={1} style={{ fontSize: 11 }}>
            {text}
        </Text>
    );

    const hero = (
        <Column>
            {caption(view.caption)}
            <Row verticalAlignment="bottom">
                <Text
                    color={view.netPositive ? palette.income : palette.ink}
                    maxLines={1}
                    style={{ fontSize: fit(view.net, heroSize), fontWeight: "500" }}
                >
                    {view.net}
                </Text>
                <Spacer modifiers={[width(5)]} />
                {caption(props.labels.net)}
            </Row>
        </Column>
    );

    const bars = (barsWidth: number, barsHeight: number, labelled: boolean) => {
        const count = Math.max(1, view.bars.length);
        const gap = count > 12 ? 1 : 3;
        const bar = Math.max(1, Math.floor((barsWidth - gap * (count - 1)) / count));
        const peak = Math.max(0, ...view.bars);
        const groups: number[][] = [];
        for (let start = 0; start < view.bars.length; start += 8) {
            groups.push(view.bars.slice(start, start + 8));
        }
        return (
            <Column>
                <Row verticalAlignment="bottom" modifiers={[height(barsHeight)]}>
                    {groups.map((group, groupIndex) => (
                        <Row key={`g${groupIndex}`} verticalAlignment="bottom">
                            {group.map((value, index) => {
                                const filled = peak > 0 && value > 0;
                                return (
                                    <Row key={`b${groupIndex * 8 + index}`} verticalAlignment="bottom">
                                        {groupIndex + index > 0 ? <Spacer modifiers={[width(gap)]} /> : null}
                                        <Box
                                            modifiers={[
                                                size(
                                                    bar,
                                                    filled ? Math.max(2, Math.round((barsHeight * value) / peak)) : 1
                                                ),
                                                cornerRadius(filled ? Math.min(2, bar / 2) : 0),
                                                background(filled ? palette.ink : palette.border),
                                            ]}
                                        />
                                    </Row>
                                );
                            })}
                        </Row>
                    ))}
                </Row>
                {labelled && view.dayInitials.length > 0 ? (
                    <Row>
                        {view.dayInitials.map((initial, index) => (
                            <Row key={`d${index}`}>
                                {index > 0 ? <Spacer modifiers={[width(gap)]} /> : null}
                                <Box contentAlignment="center" modifiers={[width(bar)]}>
                                    <Text color={palette.muted} maxLines={1} style={{ fontSize: 8, fontWeight: "500" }}>
                                        {initial}
                                    </Text>
                                </Box>
                            </Row>
                        ))}
                    </Row>
                ) : null}
            </Column>
        );
    };

    const cell = (label: string, value: string, cellWidth: number) => (
        <Column modifiers={[width(cellWidth)]}>
            {caption(label)}
            <Text color={palette.ink} maxLines={1} style={{ fontSize: 13, fontWeight: "600" }}>
                {value}
            </Text>
        </Column>
    );

    const slices = view.slices.map((slice) => (
        <Row key={slice.name} verticalAlignment="center" modifiers={[height(16)]}>
            <Box modifiers={[size(6, 6), cornerRadius(3), background(slice.color)]} />
            <Spacer modifiers={[width(6)]} />
            <Box contentAlignment="centerStart" modifiers={[width(column - 12 - 34)]}>
                <Text color={palette.ink} maxLines={1} style={{ fontSize: 11, fontWeight: "500" }}>
                    {slice.name}
                </Text>
            </Box>
            <Box contentAlignment="centerEnd" modifiers={[width(34)]}>
                {caption(slice.percent)}
            </Box>
        </Row>
    ));

    const body = wide ? (
        <Row>
            <Box modifiers={[size(column, tall)]}>
                <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                    {hero}
                </Box>
                <Box contentAlignment="bottomStart" modifiers={[fillMaxSize()]}>
                    <Column>
                        <Box modifiers={[size(column, 1), background(palette.border)]} />
                        <Spacer modifiers={[height(8)]} />
                        <Row>
                            {cell(props.labels.spent, view.spent, Math.floor(column / 2))}
                            <Box modifiers={[size(1, 28), background(palette.border)]} />
                            <Spacer modifiers={[width(10)]} />
                            {cell(props.labels.income, view.income, Math.floor(column / 2) - 11)}
                        </Row>
                    </Column>
                </Box>
            </Box>
            <Spacer modifiers={[width(columnGap)]} />
            <Column modifiers={[width(column)]}>
                {bars(column, Math.max(24, Math.min(60, tall - 8 - view.slices.length * 21)), false)}
                <Spacer modifiers={[height(8)]} />
                <Column>{slices}</Column>
            </Column>
        </Row>
    ) : (
        <Box modifiers={[size(inner, tall)]}>
            <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                {hero}
            </Box>
            <Box contentAlignment="bottomStart" modifiers={[fillMaxSize()]}>
                {bars(inner, Math.max(24, Math.min(80, tall - 70)), true)}
            </Box>
        </Box>
    );

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Button {...{ target: props.url }} modifiers={[size(inner, tall)]}>
                {body}
            </Button>
        </Box>
    );
};

export default createWidget<WidgetEnvelope<TrendsCopy>, TrendsConfiguration>(
    "Trends",
    TrendsWidget,
    ANDROID_PLACEHOLDERS.Trends
);
