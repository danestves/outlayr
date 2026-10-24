import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    AndroidConfig,
    XML,
    assertValidAndroidAssetName,
    withAndroidColors,
    withAndroidManifest,
    withDangerousMod,
    withStringsXml,
} from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

const ACCENT = "#c2371b";
const BACKGROUND = "#f2f0ea";
const BACKGROUND_COLOR = "shortcut_background";
const CANVAS_DP = 108;
const GLYPH_DP = 42;
const SHORTCUTS_META = "android.app.shortcuts";
const VIEW_BOX = 24;

interface Stroke {
    readonly d: string;
    readonly width: number;
}

interface Glyph {
    readonly span: number;
    readonly strokes: readonly Stroke[];
}

const GLYPHS = {
    add: {
        span: 18,
        strokes: [{ d: "M12 4V20M20 12H4", width: 2 }],
    },
    budgets: {
        span: 21.5,
        strokes: [
            { d: "M12,2A10,10 0 1,1 12,22A10,10 0 1,1 12,2", width: 1.5 },
            {
                d: "M12 6C13.0532 6 14.0879 6.27724 15 6.80385C15.9121 7.33046 16.6695 8.08788 17.1962 9C17.7228 9.91212 18 10.9468 18 12C18 13.0532 17.7228 14.0879 17.1962 15C16.6695 15.9121 15.9121 16.6695 15 17.1962C14.0879 17.7228 13.0532 18 12 18C10.9468 18 9.91211 17.7228 9 17.1962C8.08788 16.6695 7.33046 15.9121 6.80385 15L12 12L12 6Z",
                width: 1.5,
            },
        ],
    },
    income: {
        span: 18,
        strokes: [
            { d: "M12 4L12 19", width: 2 },
            { d: "M18 14C18 14 13.581 20 12 20C10.419 20 6 14 6 14", width: 2 },
        ],
    },
    search: {
        span: 20,
        strokes: [
            { d: "M17 17L21 21", width: 2 },
            {
                d: "M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z",
                width: 2,
            },
        ],
    },
} as const satisfies Record<string, Glyph>;

type GlyphName = keyof typeof GLYPHS;

export interface AndroidShortcut {
    readonly glyph: GlyphName;
    readonly href: string;
    readonly id: string;
    readonly title: { readonly en: string; readonly es: string };
}

interface Options {
    shortcuts: readonly AndroidShortcut[];
}

const withAndroidShortcuts: ConfigPlugin<Options> = (config, { shortcuts }) => {
    const withMeta = withAndroidManifest(config, (manifestConfig) => {
        const activity: AndroidConfig.Manifest.ManifestActivity &
            Pick<AndroidConfig.Manifest.ManifestApplication, "meta-data"> =
            AndroidConfig.Manifest.getMainActivityOrThrow(manifestConfig.modResults);
        AndroidConfig.Manifest.addMetaDataItemToMainApplication(activity, SHORTCUTS_META, "@xml/shortcuts", "resource");
        return manifestConfig;
    });

    const withColor = withAndroidColors(withMeta, (colorsConfig) => {
        colorsConfig.modResults = AndroidConfig.Colors.assignColorValue(colorsConfig.modResults, {
            name: BACKGROUND_COLOR,
            value: BACKGROUND,
        });
        return colorsConfig;
    });

    const withEnglish = withStringsXml(withColor, (stringsConfig) => {
        stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
            shortcuts.map((shortcut) =>
                AndroidConfig.Resources.buildResourceItem({
                    name: resourceName(shortcut.id),
                    value: shortcut.title.en,
                })
            ),
            stringsConfig.modResults
        );
        return stringsConfig;
    });

    return withDangerousMod(withEnglish, [
        "android",
        async (dangerousConfig) => {
            if (dangerousConfig.modRequest.introspect) {
                return dangerousConfig;
            }
            const packageName = dangerousConfig.android?.package;
            if (!packageName) {
                throw new Error("withAndroidShortcuts: android.package is not set.");
            }
            await writeResources(dangerousConfig.modRequest.platformProjectRoot, packageName, shortcuts);
            return dangerousConfig;
        },
    ]);
};

async function writeResources(
    projectRoot: string,
    packageName: string,
    shortcuts: readonly AndroidShortcut[]
): Promise<void> {
    const res = path.join(projectRoot, "app/src/main/res");
    const targetClass = await launcherClass(projectRoot, packageName);
    await mkdir(path.join(res, "xml"), { recursive: true });
    await mkdir(path.join(res, "drawable"), { recursive: true });
    await mkdir(path.join(res, "drawable-v26"), { recursive: true });
    await writeFile(path.join(res, "xml/shortcuts.xml"), shortcutsDocument(shortcuts, packageName, targetClass));
    await Promise.all(
        shortcuts.map(async (shortcut) => {
            const name = resourceName(shortcut.id);
            const glyph = GLYPHS[shortcut.glyph];
            await writeFile(path.join(res, "drawable", `${name}_fg.xml`), foregroundXml(glyph));
            await writeFile(path.join(res, "drawable", `${name}.xml`), flatIconXml(glyph));
            await writeFile(path.join(res, "drawable-v26", `${name}.xml`), adaptiveIconXml(name));
        })
    );
    await writeSpanishStrings(res, shortcuts);
}

async function launcherClass(projectRoot: string, packageName: string): Promise<string> {
    const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(
        path.join(projectRoot, "app/src/main/AndroidManifest.xml")
    );
    const activity = AndroidConfig.Manifest.getRunnableActivity(manifest);
    const name = activity?.$["android:name"];
    if (!name) {
        throw new Error("withAndroidShortcuts: AndroidManifest.xml has no launcher activity.");
    }
    return name.startsWith(".") ? `${packageName}${name}` : name;
}

async function writeSpanishStrings(res: string, shortcuts: readonly AndroidShortcut[]): Promise<void> {
    const stringsPath = path.join(res, "values-es", "strings.xml");
    const xml = await AndroidConfig.Resources.readResourcesXMLAsync({ path: stringsPath });
    await XML.writeXMLAsync({
        path: stringsPath,
        xml: AndroidConfig.Strings.setStringItem(
            shortcuts.map((shortcut) =>
                AndroidConfig.Resources.buildResourceItem({
                    name: resourceName(shortcut.id),
                    value: shortcut.title.es,
                })
            ),
            xml
        ),
    });
}

function resourceName(id: string): string {
    const name = `shortcut_${id.replaceAll("-", "_")}`;
    assertValidAndroidAssetName(name, "with-android-shortcuts");
    return name;
}

function shortcutsDocument(shortcuts: readonly AndroidShortcut[], packageName: string, targetClass: string): string {
    const items = shortcuts
        .map(
            (shortcut) => `    <shortcut
        android:enabled="true"
        android:icon="@drawable/${resourceName(shortcut.id)}"
        android:shortcutId="${escapeAttr(shortcut.id)}"
        android:shortcutLongLabel="@string/${resourceName(shortcut.id)}"
        android:shortcutShortLabel="@string/${resourceName(shortcut.id)}">
        <intent
            android:action="android.intent.action.VIEW"
            android:data="${escapeAttr(shortcut.href)}"
            android:targetClass="${escapeAttr(targetClass)}"
            android:targetPackage="${escapeAttr(packageName)}" />
    </shortcut>`
        )
        .join("\n");
    return `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${items}
</shortcuts>
`;
}

function adaptiveIconXml(name: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/${BACKGROUND_COLOR}" />
    <foreground android:drawable="@drawable/${name}_fg" />
</adaptive-icon>
`;
}

function flatIconXml(glyph: Glyph): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${CANVAS_DP}dp"
    android:height="${CANVAS_DP}dp"
    android:viewportWidth="${CANVAS_DP}"
    android:viewportHeight="${CANVAS_DP}">
    <path
        android:fillColor="@color/${BACKGROUND_COLOR}"
        android:pathData="M0,0h${CANVAS_DP}v${CANVAS_DP}H0z" />
${glyphGroup(glyph)}
</vector>
`;
}

function foregroundXml(glyph: Glyph): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${CANVAS_DP}dp"
    android:height="${CANVAS_DP}dp"
    android:viewportWidth="${CANVAS_DP}"
    android:viewportHeight="${CANVAS_DP}">
${glyphGroup(glyph)}
</vector>
`;
}

function glyphGroup(glyph: Glyph): string {
    const { scale, translate } = frame(glyph.span);
    const paths = glyph.strokes
        .map(
            (stroke) => `        <path
            android:fillColor="@android:color/transparent"
            android:pathData="${stroke.d}"
            android:strokeColor="${ACCENT}"
            android:strokeLineCap="round"
            android:strokeLineJoin="round"
            android:strokeWidth="${stroke.width}" />`
        )
        .join("\n");
    return `    <group
        android:scaleX="${scale}"
        android:scaleY="${scale}"
        android:translateX="${translate}"
        android:translateY="${translate}">
${paths}
    </group>`;
}

function frame(span: number) {
    const scale = GLYPH_DP / span;
    return { scale: decimal(scale), translate: decimal((CANVAS_DP - VIEW_BOX * scale) / 2) };
}

function decimal(value: number): string {
    return value.toFixed(4).replace(/\.?0+$/, "");
}

function escapeAttr(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll("'", "&apos;");
}

export default withAndroidShortcuts;
