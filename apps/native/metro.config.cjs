"use strict";

const { existsSync } = require("node:fs");
const path = require("node:path");

const { withVarlockMetroConfig } = require("@varlock/expo-integration/metro-config");
const { getPostHogExpoConfig } = require("posthog-react-native/metro");
const { configMetroIntlayerSync } = require("react-native-intlayer/metro");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getPostHogExpoConfig(__dirname);

// Skia's `src/index.ts` re-exports a directory, and directory-index resolution only searches crawled files.
const pnpmStore = path.resolve(__dirname, "../../node_modules");
if (!config.watchFolders.includes(pnpmStore)) {
    config.watchFolders.push(pnpmStore);
}

// Drizzle's migrations import `.sql`. Must precede the wrappers, which extend (never reset) the resolver.
config.resolver.sourceExts.push("sql");

// Outermost bar varlock, so intlayer chains onto the `.sql` extension and both wrappers. The sync variant leaves the
// dictionaries to `vp run i18n:build`.
const finalConfig = withVarlockMetroConfig(
    configMetroIntlayerSync(
        withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
            cssEntryFile: "./global.css",
            dtsFile: "./uniwind-types.d.ts",
        })
    )
);

// RevenueCat's ~1 MB web SDK only runs in browser mode; native builds always carry `RNPurchases`.
// The AI SDK's `zod/v4` resolves to `.cjs` while the app's `zod` gets `.js`: a second ~500 KB zod.
const BROWSER_ONLY_MODULES = new Set(["@revenuecat/purchases-js-hybrid-mappings"]);
const FREE_ICONS = process.env.OUTLAYR_FREE_ICONS === "1";
const DRIZZLE_EFFECT_SCHEMA = `${path.sep}drizzle-orm${path.sep}effect-schema${path.sep}`;
const DRIZZLE_EFFECT_ROOT = path.resolve(__dirname, "src/lib/drizzle-effect-root.ts");
const upstreamResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver = {
    ...finalConfig.resolver,
    resolveRequest: (context, moduleName, platform) => {
        const resolve = upstreamResolveRequest ?? context.resolveRequest;
        if (platform !== "web" && BROWSER_ONLY_MODULES.has(moduleName)) {
            return { type: "empty" };
        }
        if (FREE_ICONS && moduleName.startsWith("@hugeicons-pro/")) {
            const icon = moduleName.split("/").at(-1);
            try {
                return resolve(context, `@hugeicons/core-free-icons/${icon}`, platform);
            } catch {
                return resolve(context, "@hugeicons/core-free-icons/CircleDashedIcon", platform);
            }
        }
        if (moduleName === "effect" && context.originModulePath.includes(DRIZZLE_EFFECT_SCHEMA)) {
            return { filePath: DRIZZLE_EFFECT_ROOT, type: "sourceFile" };
        }
        const resolution = resolve(context, moduleName, platform);
        if ((moduleName === "zod" || moduleName.startsWith("zod/")) && resolution.filePath?.endsWith(".cjs")) {
            const esmTwin = resolution.filePath.replace(/\.cjs$/, ".js");
            if (existsSync(esmTwin)) {
                return { ...resolution, filePath: esmTwin };
            }
        }
        return resolution;
    },
};

module.exports = finalConfig;
