import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { withDangerousMod } from "expo/config-plugins";
import type { ConfigPlugin } from "expo/config-plugins";

import WIDGET_PALETTE from "../src/widgets/palette.json";

interface Stroke {
    readonly d: string;
    readonly width: number;
}

const ICONS = {
    widget_add: [{ d: "M12 4V20M20 12H4", width: 2 }],
    widget_amount: [
        {
            d: "M12 7.5H13.5C14.3284 7.5 15 8.17157 15 9M12 7.5H10.5C9.67157 7.5 9 8.17157 9 9V9.5C9 10.3284 9.67157 11 10.5 11H13.5C14.3284 11 15 11.6716 15 12.5V13C15 13.8284 14.3284 14.5 13.5 14.5H12M12 7.5V6M12 14.5H10.5C9.67157 14.5 9 13.8284 9 13M12 14.5V16",
            width: 1.5,
        },
        {
            d: "M10.94 21.5124L9.02913 20.3073C8.54415 20.0014 8.30166 19.8485 8.03253 19.8397C7.74172 19.8301 7.49493 19.9768 6.97087 20.3073C6.38395 20.6774 5.21687 21.6971 4.46195 21.2108C4 20.9133 4 20.1575 4 18.6458V8.00002C4 5.17158 4 3.75736 4.82699 2.87868C5.65399 2 6.98501 2 9.64706 2H14.3529C17.015 2 18.346 2 19.173 2.87868C20 3.75736 20 5.17158 20 8.00002V18.6458C20 20.1575 20 20.9133 19.538 21.2108C18.7831 21.6971 17.6161 20.6774 17.0291 20.3073C16.5441 20.0014 16.3017 19.8485 16.0325 19.8397C15.7417 19.8301 15.4949 19.9768 14.9709 20.3073L13.06 21.5124C12.5445 21.8374 12.2868 22 12 22C11.7132 22 11.4554 21.8374 10.94 21.5124Z",
            width: 1.5,
        },
    ],
    widget_eye: [
        {
            d: "M21.544 11.045C21.848 11.4713 22 11.6845 22 12C22 12.3155 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.3155 2 12C2 11.6845 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z",
            width: 1.5,
        },
        {
            d: "M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z",
            width: 1.5,
        },
    ],
    widget_eye_off: [
        {
            d: "M19.439 15.439C20.3636 14.5212 21.0775 13.6091 21.544 12.955C21.848 12.5287 22 12.3155 22 12C22 11.6845 21.848 11.4713 21.544 11.045C20.1779 9.12944 16.6892 5 12 5C11.0922 5 10.2294 5.15476 9.41827 5.41827M6.74742 6.74742C4.73118 8.1072 3.24215 9.94266 2.45604 11.045C2.15201 11.4713 2 11.6845 2 12C2 12.3155 2.15201 12.5287 2.45604 12.955C3.8221 14.8706 7.31078 19 12 19C13.9908 19 15.7651 18.2557 17.2526 17.2526",
            width: 1.5,
        },
        {
            d: "M9.85786 10C9.32783 10.53 9 11.2623 9 12.0711C9 13.6887 10.3113 15 11.9289 15C12.7377 15 13.47 14.6722 14 14.1421",
            width: 1.5,
        },
        { d: "M3 3L21 21", width: 1.5 },
    ],
    widget_scan: [
        {
            d: "M16.0042 2.5C17.9974 2.61348 19.2576 2.93381 20.1619 3.83811C21.0662 4.74243 21.3865 6.00268 21.5 7.99598M7.99582 2.5C6.00261 2.61348 4.74241 2.93381 3.83812 3.83811C2.9338 4.74243 2.61347 6.00268 2.5 7.99598M21.5 16.004C21.3865 17.9973 21.0662 19.2576 20.1619 20.1619C19.2576 21.0662 17.9973 21.3865 16.004 21.5M2.5 16.004C2.61347 17.9973 2.9338 19.2576 3.83812 20.1619C4.74244 21.0662 6.00268 21.3865 7.99597 21.5",
            width: 1.5,
        },
        { d: "M5 12H19", width: 1.5 },
    ],
    widget_voice: [
        {
            d: "M7 6.5C7 4.01472 9.01472 2 11.5 2C13.9853 2 16 4.01472 16 6.5V11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5V6.5Z",
            width: 1.5,
        },
        {
            d: "M11.5 19H11.0828C7.57267 19 4.57706 16.4623 4 13M11.5 19H11.9172C15.4273 19 18.4229 16.4623 19 13M11.5 19V22",
            width: 1.5,
        },
    ],
} as const satisfies Readonly<Record<string, readonly Stroke[]>>;

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
            await writePreviews(res, widgets);
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

function previewLayoutName(name: string): string {
    return `widget_${resourceName(name)}_preview`;
}

const ACTION_ICONS = ["widget_amount", "widget_voice", "widget_scan"] as const;

const circles = (size: number, gap: number) =>
    ACTION_ICONS.map(
        (icon) => `        <FrameLayout
            android:layout_width="${size}dp"
            android:layout_height="${size}dp"
            android:layout_marginHorizontal="${gap}dp"
            android:background="@drawable/widget_preview_circle">
            <ImageView
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_gravity="center"
                android:src="@drawable/${icon}"
                android:tint="@color/outlayr_widget_background" />
        </FrameLayout>`
    ).join("\n");

const pills = ACTION_ICONS.map(
    (icon) => `        <FrameLayout
            android:layout_width="0dp"
            android:layout_height="44dp"
            android:layout_weight="1"
            android:layout_marginHorizontal="3dp"
            android:background="@drawable/widget_preview_pill">
            <ImageView
                android:layout_width="16dp"
                android:layout_height="16dp"
                android:layout_gravity="center"
                android:src="@drawable/${icon}"
                android:tint="@color/outlayr_widget_ink" />
        </FrameLayout>`
).join("\n");

const bar = (widthDp: number) => `<FrameLayout
                android:layout_width="${widthDp}dp"
                android:layout_height="8dp"
                android:layout_marginBottom="6dp"
                android:background="@drawable/widget_preview_bar" />`;

const mask = (sizeSp: number) => `<TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="••••"
                android:textColor="@color/outlayr_widget_ink"
                android:textSize="${sizeSp}sp" />`;

const stat = (extra = "") => `        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            ${bar(48)}
            ${mask(20)}${extra}
        </LinearLayout>`;

const entryRow = (noteDp: number) => `        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="10dp"
            android:gravity="center_vertical"
            android:orientation="horizontal">
            <FrameLayout
                android:layout_width="8dp"
                android:layout_height="8dp"
                android:layout_marginHorizontal="5dp"
                android:background="@drawable/widget_preview_dot" />
            <FrameLayout
                android:layout_width="${noteDp}dp"
                android:layout_height="8dp"
                android:layout_marginStart="8dp"
                android:background="@drawable/widget_preview_bar" />
            <FrameLayout
                android:layout_width="0dp"
                android:layout_height="1dp"
                android:layout_weight="1" />
            <FrameLayout
                android:layout_width="40dp"
                android:layout_height="8dp"
                android:background="@drawable/widget_preview_bar" />
        </LinearLayout>`;

const column = (heightDp: number) => `            <FrameLayout
                android:layout_width="0dp"
                android:layout_height="${heightDp}dp"
                android:layout_weight="1"
                android:layout_marginHorizontal="2dp"
                android:background="@drawable/widget_preview_column" />`;

const REMOTE_VIEWS_TAGS = new Set(["FrameLayout", "ImageView", "LinearLayout", "TextView"]);
const XML_TAG = /<(\w+)/g;

const PREVIEWS = new Map([
    [
        "Entries",
        `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_card"
    android:orientation="vertical"
    android:padding="14dp">
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            ${bar(72)}
            ${mask(20)}
        </LinearLayout>
        <FrameLayout
            android:layout_width="30dp"
            android:layout_height="30dp"
            android:background="@drawable/widget_preview_circle">
            <ImageView
                android:layout_width="18dp"
                android:layout_height="18dp"
                android:layout_gravity="center"
                android:src="@drawable/widget_add"
                android:tint="@color/outlayr_widget_background" />
        </FrameLayout>
    </LinearLayout>
    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="8dp"
        android:background="@color/outlayr_widget_border" />
${entryRow(96)}
${entryRow(64)}
${entryRow(80)}
</LinearLayout>
`,
    ],
    [
        "Overview",
        `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_card"
    android:orientation="vertical"
    android:padding="14dp">
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="horizontal">
${stat()}
${stat()}
${stat(`
            <FrameLayout
                android:layout_width="match_parent"
                android:layout_height="4dp"
                android:layout_marginTop="4dp"
                android:background="@drawable/widget_preview_bar" />`)}
    </LinearLayout>
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal">
${pills}
    </LinearLayout>
</LinearLayout>
`,
    ],
    [
        "Trends",
        `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_card"
    android:orientation="vertical"
    android:padding="14dp">
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical">
            ${bar(56)}
            ${mask(26)}
    </LinearLayout>
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="44dp"
        android:gravity="bottom"
        android:orientation="horizontal">
${[14, 30, 9, 44, 20, 3, 3].map(column).join("\n")}
    </LinearLayout>
</LinearLayout>
`,
    ],
    [
        "Today",
        `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_card"
    android:orientation="vertical"
    android:padding="14dp">
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical">
            ${bar(64)}
            ${mask(28)}
    </LinearLayout>
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="horizontal">
${circles(36, 3)}
    </LinearLayout>
</LinearLayout>
`,
    ],
    [
        "Wallet",
        `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_card"
    android:orientation="horizontal"
    android:padding="12dp">
    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_weight="1"
        android:orientation="vertical"
        android:padding="4dp">
        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="0dp"
            android:layout_weight="1"
            android:gravity="top"
            android:orientation="horizontal">
            <ImageView
                android:layout_width="18dp"
                android:layout_height="18dp"
                android:src="@drawable/widget_logo"
                android:tint="@color/outlayr_widget_ink" />
            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="6dp"
                android:text="outlayr"
                android:textColor="@color/outlayr_widget_ink"
                android:textSize="15sp"
                android:textStyle="bold" />
        </LinearLayout>
            ${bar(56)}
            ${mask(26)}
    </LinearLayout>
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="match_parent"
        android:layout_marginStart="10dp"
        android:background="@drawable/widget_preview_panel"
        android:gravity="center"
        android:orientation="horizontal"
        android:paddingHorizontal="4dp">
${circles(44, 6)}
    </LinearLayout>
</LinearLayout>
`,
    ],
]);

const fillDrawable = (radiusDp: number, color: string, oval = false) => `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"${oval ? ` android:shape="oval"` : ""}>
    <solid android:color="@color/${color}" />${oval ? "" : `\n    <corners android:radius="${radiusDp}dp" />`}
</shape>
`;

const colorsXml = (palette: typeof WIDGET_PALETTE.light) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
${Object.entries(palette)
    .map(([role, color]) => `    <color name="outlayr_widget_${role}">${color}</color>`)
    .join("\n")}
</resources>
`;

async function writePreviews(res: string, widgets: readonly AndroidWidgetCopy[]) {
    await mkdir(path.join(res, "layout"), { recursive: true });
    await mkdir(path.join(res, "values-night"), { recursive: true });
    await Promise.all([
        writeFile(path.join(res, "values", "outlayr_widget_colors.xml"), colorsXml(WIDGET_PALETTE.light)),
        writeFile(path.join(res, "values-night", "outlayr_widget_colors.xml"), colorsXml(WIDGET_PALETTE.dark)),
        writeFile(path.join(res, "drawable", "widget_preview_card.xml"), fillDrawable(24, "outlayr_widget_background")),
        writeFile(path.join(res, "drawable", "widget_preview_panel.xml"), fillDrawable(18, "outlayr_widget_border")),
        writeFile(path.join(res, "drawable", "widget_preview_pill.xml"), fillDrawable(14, "outlayr_widget_border")),
        writeFile(path.join(res, "drawable", "widget_preview_bar.xml"), fillDrawable(4, "outlayr_widget_border")),
        writeFile(path.join(res, "drawable", "widget_preview_circle.xml"), fillDrawable(0, "outlayr_widget_ink", true)),
        writeFile(path.join(res, "drawable", "widget_preview_dot.xml"), fillDrawable(0, "outlayr_widget_border", true)),
        writeFile(path.join(res, "drawable", "widget_preview_column.xml"), fillDrawable(2, "outlayr_widget_ink")),
        ...widgets.map((widget) => {
            const layout = PREVIEWS.get(widget.name);
            if (!layout) {
                throw new Error(`No picker preview for the ${widget.name} widget`);
            }
            const unsupported = [...layout.matchAll(XML_TAG)].find(([, tag]) => !REMOTE_VIEWS_TAGS.has(tag ?? ""));
            if (unsupported) {
                throw new Error(
                    `The ${widget.name} picker preview uses ${unsupported[1]}, which RemoteViews cannot inflate`
                );
            }
            return writeFile(
                path.join(res, "layout", `${previewLayoutName(widget.name)}.xml`),
                `<?xml version="1.0" encoding="utf-8"?>\n${layout}`
            );
        }),
    ]);
}

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

function iconXml(strokes: readonly Stroke[]): string {
    const paths = strokes
        .map(
            (stroke) => `    <path
        android:fillColor="@android:color/transparent"
        android:pathData="${stroke.d}"
        android:strokeColor="#FFFFFFFF"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:strokeWidth="${stroke.width}" />`
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
