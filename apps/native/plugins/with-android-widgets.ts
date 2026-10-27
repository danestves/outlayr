import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Mic01Icon from "@hugeicons-pro/core-stroke-rounded/Mic01Icon";
import ReceiptDollarIcon from "@hugeicons-pro/core-stroke-rounded/ReceiptDollarIcon";
import ScanIcon from "@hugeicons-pro/core-stroke-rounded/ScanIcon";
import ViewIcon from "@hugeicons-pro/core-stroke-rounded/ViewIcon";
import ViewOffSlashIcon from "@hugeicons-pro/core-stroke-rounded/ViewOffSlashIcon";
import { withDangerousMod } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

type HugeIcon = readonly (readonly [string, Readonly<Record<string, string | number>>])[];

/** Same glyphs as the in-app add menu (`floating-add-button.android.tsx`). Tinted per scheme by the layout. */
const ICONS = {
    widget_amount: ReceiptDollarIcon,
    widget_eye: ViewIcon,
    widget_eye_off: ViewOffSlashIcon,
    widget_scan: ScanIcon,
    widget_voice: Mic01Icon,
} satisfies Readonly<Record<string, HugeIcon>>;

const TRANSLATED_LANGUAGES = ["es", "fr", "pt"] as const;

type TranslatedLanguage = (typeof TRANSLATED_LANGUAGES)[number];

type Translated = { readonly en: string } & Readonly<Record<TranslatedLanguage, string>>;

export interface AndroidWidgetCopy {
    readonly description: Translated;
    readonly displayName: Translated;
    readonly name: string;
}

interface Options {
    widgets: readonly AndroidWidgetCopy[];
}

/**
 * `expo-widgets` writes only English picker strings, under these resource names, and expects drawables for any
 * `Image` a layout names.
 */
const withAndroidWidgets: ConfigPlugin<Options> = (config, { widgets }) =>
    withDangerousMod(config, [
        "android",
        async (dangerousConfig) => {
            if (dangerousConfig.modRequest.introspect) {
                return dangerousConfig;
            }
            const res = path.join(dangerousConfig.modRequest.platformProjectRoot, "app/src/main/res");
            const logo = await readFile(path.join(dangerousConfig.modRequest.projectRoot, "assets/logo.svg"), "utf-8");
            await mkdir(path.join(res, "drawable"), { recursive: true });
            await writeFile(path.join(res, "drawable", "widget_logo.xml"), logoXml(logo));
            await Promise.all(
                Object.entries(ICONS).map(([name, icon]) =>
                    writeFile(path.join(res, "drawable", `${name}.xml`), iconXml(icon))
                )
            );
            await Promise.all(
                TRANSLATED_LANGUAGES.map(async (language) => {
                    await mkdir(path.join(res, `values-${language}`), { recursive: true });
                    await writeFile(
                        path.join(res, `values-${language}`, "outlayr_widgets.xml"),
                        stringsXml(widgets, language)
                    );
                })
            );
            return dangerousConfig;
        },
    ]);

/** Mirrors `toAndroidResourceName` in `expo-widgets/plugin/build/android/resourceNames.js`. */
function resourceName(name: string): string {
    return name
        .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase();
}

function stringsXml(widgets: readonly AndroidWidgetCopy[], language: TranslatedLanguage): string {
    const items = widgets.flatMap((widget) => [
        `    <string name="${resourceName(widget.name)}_display_name">${escape(widget.displayName[language])}</string>`,
        `    <string name="${resourceName(widget.name)}_description">${escape(widget.description[language])}</string>`,
    ]);
    return `<?xml version="1.0" encoding="utf-8"?>
<resources>
${items.join("\n")}
</resources>
`;
}

function escape(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll("'", String.raw`\'`);
}

function iconXml(icon: HugeIcon): string {
    const paths = icon
        .filter(([tag]) => tag === "path")
        .map(
            ([, attributes]) => `    <path
        android:fillColor="@android:color/transparent"
        android:pathData="${attributes.d}"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:strokeWidth="${attributes.strokeWidth ?? 1.5}" />`
        )
        .join("\n");
    return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${paths}
</vector>
`;
}

const SVG_VIEW_BOX = /viewBox="0 0 ([\d.]+) ([\d.]+)"/;
const SVG_PATH = /\sd="([^"]+)"/g;

function logoXml(svg: string): string {
    const [, viewWidth = "24", viewHeight = "24"] = SVG_VIEW_BOX.exec(svg) ?? [];
    const paths = [...svg.matchAll(SVG_PATH)]
        .map(
            ([, d]) => `    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${d}" />`
        )
        .join("\n");
    return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="${viewWidth}"
    android:viewportHeight="${viewHeight}">
${paths}
</vector>
`;
}

export default withAndroidWidgets;
