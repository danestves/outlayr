import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { AndroidConfig, withAndroidStyles, withDangerousMod } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

// From `com.google.android.material`, which `@expo/ui` already puts on the classpath for Compose.
const MATERIAL_THEME = "Theme.Material3.DynamicColors.DayNight.NoActionBar";

const ALERT_THEME = "Theme.App.AlertDialog";
const ALERT_BACKGROUND = "m3_alert_dialog_background";

// RN's `Alert` goes through AppCompat's builder, which only reads the window background, and MDC's default for
// that is the 4dp Material 2 card.
const ALERT_BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetLeft="24dp"
    android:insetTop="80dp"
    android:insetRight="24dp"
    android:insetBottom="80dp">
    <shape android:shape="rectangle">
        <corners android:radius="28dp" />
        <solid android:color="?attr/colorSurfaceContainerHigh" />
    </shape>
</inset>
`;

// Expo's static `colorPrimary` goes too: it pins every dialog button to one colour.
// Expo's own style mods run before this one (later plugins' mods run first).
const withAndroidMaterialTheme: ConfigPlugin = (config) => {
    const withBackground = withDangerousMod(config, [
        "android",
        async (dangerousConfig) => {
            const drawables = path.join(dangerousConfig.modRequest.platformProjectRoot, "app/src/main/res/drawable");
            await mkdir(drawables, { recursive: true });
            await writeFile(path.join(drawables, `${ALERT_BACKGROUND}.xml`), ALERT_BACKGROUND_XML);
            return dangerousConfig;
        },
    ]);

    return withAndroidStyles(withBackground, (stylesConfig) => {
        const appTheme = AndroidConfig.Styles.getAppThemeGroup();
        let styles = stylesConfig.modResults;
        const theme = styles.resources.style?.find((style) => style.$.name === appTheme.name);
        if (!theme) {
            throw new Error(`withAndroidMaterialTheme: no ${appTheme.name} style in styles.xml.`);
        }
        theme.$.parent = MATERIAL_THEME;
        styles = AndroidConfig.Styles.assignStylesValue(styles, {
            add: false,
            name: "colorPrimary",
            parent: appTheme,
            value: "",
        });
        styles = AndroidConfig.Styles.assignStylesValue(styles, {
            add: true,
            name: "alertDialogTheme",
            parent: appTheme,
            value: `@style/${ALERT_THEME}`,
        });
        stylesConfig.modResults = AndroidConfig.Styles.assignStylesValue(styles, {
            add: true,
            name: "android:windowBackground",
            parent: { name: ALERT_THEME, parent: "ThemeOverlay.Material3.Dialog.Alert" },
            value: `@drawable/${ALERT_BACKGROUND}`,
        });
        return stylesConfig;
    });
};

export default withAndroidMaterialTheme;
