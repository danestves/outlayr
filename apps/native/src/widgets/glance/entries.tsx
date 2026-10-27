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

import type { EntriesConfiguration, EntriesCopy, WidgetEnvelope } from "./envelope";
import { ANDROID_PLACEHOLDERS } from "./placeholders";

const EntriesWidget = (snapshot: WidgetEnvelope<EntriesCopy>, environment: WidgetEnvironment<EntriesConfiguration>) => {
    "widget";

    const [language = "en", region = ""] = (environment.locale ?? "en").split("-");
    const byTag: Partial<Record<string, EntriesCopy>> = snapshot.locales;
    const props = byTag[`${language}-${region}`] ?? byTag[language] ?? snapshot.locales.en;
    const { palette } = snapshot;
    const widgetWidth = environment.width ?? 340;
    const widgetHeight = environment.height ?? 150;
    const pad = 14;
    const inner = widgetWidth - pad * 2;
    const tall = widgetHeight >= 220;
    const header =
        props.headers[environment.configuration?.period ?? "month"]?.[environment.configuration?.measure ?? "spent"] ??
        props.headers.month.spent;
    const figureSize = tall ? 26 : 20;
    const headerHeight = 15 + Math.ceil(figureSize * 1.75);
    const rowHeight = 20;
    const rowGap = tall ? 11 : 8;
    const room = widgetHeight - pad * 2 - headerHeight - 17;
    const rows = props.entries.slice(0, Math.max(1, Math.floor((room + rowGap) / (rowHeight + rowGap))));
    const glyph = 18;
    const amountWidth = Math.ceil(Math.max(4, ...rows.map((entry) => entry.amount.length)) * 13 * 0.58);
    const nameWidth = inner - glyph - 8 - 8 - amountWidth;
    const fitNote = (note: string, when: string) => {
        const budget = Math.floor((nameWidth - (when.length + 3) * 12 * 0.55) / (13 * 0.56));
        return note.length > budget ? `${note.slice(0, Math.max(1, budget - 1)).trimEnd()}…` : note;
    };
    const figureColor = header.tone === "income" ? palette.income : palette.ink;

    return (
        <Box modifiers={[fillMaxSize(), cornerRadius(24), background(palette.background), paddingAll(pad)]}>
            <Column>
                <Row verticalAlignment="center">
                    <Column modifiers={[width(inner - 38)]}>
                        <Text color={palette.muted} maxLines={1} style={{ fontSize: 11 }}>
                            {header.caption}
                        </Text>
                        <Text color={figureColor} maxLines={1} style={{ fontSize: figureSize, fontWeight: "500" }}>
                            {header.amount}
                        </Text>
                    </Column>
                    <Spacer modifiers={[width(8)]} />
                    <Button
                        {...{ target: props.add.url }}
                        modifiers={[size(30, 30), cornerRadius(15), background(palette.ink)]}
                    >
                        <Image
                            source={{ uri: props.add.icon }}
                            contentDescription={props.add.label}
                            tint={palette.background}
                            modifiers={[size(18, 18)]}
                        />
                    </Button>
                </Row>
                <Spacer modifiers={[height(8)]} />
                <Box modifiers={[size(inner, 1), background(palette.border)]} />
                <Spacer modifiers={[height(8)]} />
                <Button {...{ target: props.url }} modifiers={[size(inner, Math.max(rowHeight, room))]}>
                    <Box contentAlignment="topStart" modifiers={[fillMaxSize()]}>
                        {rows.length === 0 ? (
                            <Text color={palette.muted} maxLines={1} style={{ fontSize: 13 }}>
                                {props.empty}
                            </Text>
                        ) : (
                            <Column>
                                {rows.map((entry, index) => (
                                    <Column key={entry.id}>
                                        {index > 0 ? <Spacer modifiers={[height(rowGap)]} /> : null}
                                        <Row verticalAlignment="center" modifiers={[height(rowHeight)]}>
                                            <Box contentAlignment="center" modifiers={[size(glyph, glyph)]}>
                                                {entry.emoji ? (
                                                    <Text maxLines={1} style={{ fontSize: 13 }}>
                                                        {entry.emoji}
                                                    </Text>
                                                ) : (
                                                    <Box
                                                        modifiers={[
                                                            size(8, 8),
                                                            cornerRadius(4),
                                                            background(entry.color),
                                                        ]}
                                                    />
                                                )}
                                            </Box>
                                            <Spacer modifiers={[width(8)]} />
                                            <Row verticalAlignment="center" modifiers={[width(nameWidth)]}>
                                                <Text color={palette.ink} maxLines={1} style={{ fontSize: 13 }}>
                                                    {fitNote(entry.note, entry.when)}
                                                </Text>
                                                <Text color={palette.muted} maxLines={1} style={{ fontSize: 12 }}>
                                                    {` · ${entry.when}`}
                                                </Text>
                                            </Row>
                                            <Spacer modifiers={[width(8)]} />
                                            <Box contentAlignment="centerEnd" modifiers={[width(amountWidth)]}>
                                                <Text
                                                    color={entry.income ? palette.income : palette.ink}
                                                    maxLines={1}
                                                    style={{ fontSize: 13, fontWeight: "500" }}
                                                >
                                                    {entry.amount}
                                                </Text>
                                            </Box>
                                        </Row>
                                    </Column>
                                ))}
                            </Column>
                        )}
                    </Box>
                </Button>
            </Column>
        </Box>
    );
};

export default createWidget<WidgetEnvelope<EntriesCopy>, EntriesConfiguration>(
    "Entries",
    EntriesWidget,
    ANDROID_PLACEHOLDERS.Entries
);
