import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";
import type { Plugin } from "vite-plus";

const here = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

const REACT_NATIVE_PACKAGES =
    /\/node_modules\/(?:@material\/material-color-utilities|drizzle-orm|expo[^/]*|@expo(?:-google-fonts)?\/[^/]+|react-native[^/]*|@react-native[^/]*\/[^/]+|@shopify\/react-native-skia|@hugeicons\/react-native|@legendapp\/list|@better-auth\/expo|@revenuecat\/[^/]+|panelui-native|uniwind|posthog-react-native|number-flow-react-native|thinking-orbs)\//;

const REANIMATED_WEB_ONLY = new Set([
    "initializers",
    "mutables",
    "mappers",
    "ConfigHelper",
    "UpdateLayoutAnimations",
    "useAnimatedRef",
    "useAnimatedStyle",
    "WorkletEventHandler",
    "JSPropsUpdater",
    "updateProps",
    "util",
    "AnimatedComponent",
]);

const reanimatedWebOnly: Plugin = {
    enforce: "pre",
    name: "outlayr:reanimated-web-only",
    resolveId(source, importer) {
        const webOnly =
            importer?.includes("/react-native-worklets/") ||
            (importer?.includes("/react-native-reanimated/") &&
                REANIMATED_WEB_ONLY.has(source.split("/").at(-1) ?? ""));
        if (!(webOnly && source.startsWith(".") && importer)) {
            return null;
        }
        const base = path.resolve(path.dirname(importer), source);
        return [".ts", ".tsx", ".js", "/index.ts", "/index.js"]
            .map((ext) => base + ext)
            .find((file) => existsSync(file));
    },
};

const sqlAsText: Plugin = {
    name: "outlayr:sql-as-text",
    transform: (code, id) => (id.endsWith(".sql") ? `export default ${JSON.stringify(code)};` : null),
};

const METRO_ENTRY_POINTS = {
    conditions: ["react-native", "import", "module", "default"],
    mainFields: ["react-native", "module", "main"],
};

interface WorkletTransformOptions {
    babelrc: false;
    configFile: false;
    filename: string;
    parserOpts: { plugins: string[] };
    plugins: string[];
    sourceMaps: true;
}

const babel: {
    transformAsync: (
        code: string,
        options: WorkletTransformOptions
    ) => Promise<{
        code?: string | null;
        map?: { mappings: string; names: string[]; sources: string[]; version: number } | null;
    } | null>;
} = createRequire(createRequire(import.meta.url).resolve("babel-preset-expo"))("@babel/core");

const WORKLET_SOURCE = /worklet|useAnimated|useDerivedValue|useFrameCallback|runOnUI|scheduleOn/;

const worklets: Plugin = {
    enforce: "pre",
    name: "outlayr:worklets",
    async transform(code, id) {
        if (!/\/src\/.*\.tsx?$/.test(id) || id.includes("/node_modules/") || !WORKLET_SOURCE.test(code)) {
            return null;
        }
        const result = await babel.transformAsync(code, {
            babelrc: false,
            configFile: false,
            filename: id,
            parserOpts: { plugins: ["typescript", "jsx"] },
            plugins: ["react-native-worklets/plugin"],
            sourceMaps: true,
        });
        return result?.code ? { code: result.code, map: result.map } : null;
    },
};

const ANDROID_TESTS = "src/**/*.android.test.ts";

const extensionsFor = (os: "ios" | "android"): string[] =>
    [os, "native", ""].flatMap((platform) =>
        [".ts", ".tsx", ".js", ".mjs", ".json"].map((ext) => (platform ? `.${platform}${ext}` : ext))
    );

export default defineConfig({
    plugins: [reanimatedWebOnly, sqlAsText, worklets],
    resolve: {
        ...METRO_ENTRY_POINTS,
        alias: [
            { find: /^@\/assets\/(.*)$/, replacement: here("assets/$1") },
            { find: /^@\/env$/, replacement: here("test/env.ts") },
            { find: /^@\/(.*)$/, replacement: here("src/$1") },
            {
                find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
                replacement: here("test/codegen-native-component.ts"),
            },
            { find: /^react-native(?:\/.*)?$/, replacement: here("test/react-native.ts") },
            { find: /^expo(?:-asset|-modules-core)?(?:\/.*)?$/, replacement: here("test/expo.ts") },
            { find: /^react-native-is-edge-to-edge$/, replacement: here("test/is-edge-to-edge.ts") },
            { find: /^react-native-purchases$/, replacement: here("test/react-native-purchases.ts") },
            { find: /^react-native-worklets$/, replacement: "react-native-worklets/src/mock" },
        ],
    },
    environments: { ssr: { resolve: METRO_ENTRY_POINTS } },
    run: {
        tasks: {
            "i18n:build": {
                command: "intlayer build",
                cache: {
                    // The generated dictionaries are the output; making them inputs would fingerprint
                    // the task on what it writes. The cache and tmp dirs are intlayer-internal and
                    // churn on every run, so they stay out of both lists.
                    input: [{ auto: true }, "!.intlayer/**"],
                    output: [{ auto: true }, "!.intlayer/cache/**", "!.intlayer/tmp/**"],
                },
            },
        },
    },
    test: {
        allowOnly: false,
        fsModuleCache: true,
        testTimeout: 30_000,
        globalSetup: "test/global-setup.ts",
        server: { deps: { inline: [REACT_NATIVE_PACKAGES] } },
        setupFiles: ["test/setup.ts"],
        projects: [
            {
                extends: true,
                resolve: { extensions: extensionsFor("ios") },
                test: { name: "ios", include: ["src/**/*.test.{ts,tsx}"], exclude: [ANDROID_TESTS] },
            },
            {
                extends: true,
                resolve: { extensions: extensionsFor("android") },
                test: { name: "android", include: [ANDROID_TESTS], env: { EXPO_OS: "android" } },
            },
        ],
    },
});
