import { Box, Button, Image, Row } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, size } from "@expo/ui/jetpack-compose/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { createWidget } from "expo-widgets";

import type { QuickAddCopy, WidgetEnvelope } from "./envelope";
import { ANDROID_PLACEHOLDERS } from "./placeholders";

const QuickAddWidget = (snapshot: WidgetEnvelope<QuickAddCopy>, environment: WidgetEnvironment) => {
    "widget";

    const [language = "en", region = ""] = (environment.locale ?? "en").split("-");
    const byTag: Partial<Record<string, QuickAddCopy>> = snapshot.locales;
    const props = byTag[`${language}-${region}`] ?? byTag[language] ?? snapshot.locales.en;
    const { palette } = snapshot;
    const circle = Math.max(36, Math.min(64, Math.min(environment.width ?? 56, environment.height ?? 56) - 8));
    const icon = Math.round(circle * 0.45);

    return (
        <Box contentAlignment="center" modifiers={[fillMaxSize()]}>
            <Button
                {...{ target: props.url }}
                modifiers={[size(circle, circle), cornerRadius(circle / 2), background(palette.ink)]}
            >
                <Row verticalAlignment="center">
                    <Image
                        source={{ uri: props.icon }}
                        contentDescription={props.label}
                        tint={palette.background}
                        modifiers={[size(icon, icon)]}
                    />
                </Row>
            </Button>
        </Box>
    );
};

export default createWidget<WidgetEnvelope<QuickAddCopy>>("QuickAdd", QuickAddWidget, ANDROID_PLACEHOLDERS.QuickAdd);
