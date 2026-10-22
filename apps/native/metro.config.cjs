"use strict";

const { existsSync } = require("node:fs");
const path = require("node:path");

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

// Outermost, so intlayer chains onto the `.sql` extension and both wrappers. The sync variant leaves the
// dictionaries to `vp run i18n:build`.
const finalConfig = configMetroIntlayerSync(
    withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
        cssEntryFile: "./global.css",
        dtsFile: "./uniwind-types.d.ts",
    })
);

// RevenueCat's ~1 MB web SDK only runs in browser mode; native builds always carry `RNPurchases`.
// The AI SDK's `zod/v4` resolves to `.cjs` while the app's `zod` gets `.js`: a second ~500 KB zod.
const BROWSER_ONLY_MODULES = new Set(["@revenuecat/purchases-js-hybrid-mappings"]);
const FREE_ICONS = process.env.OUTLAYR_FREE_ICONS === "1";
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

const SIM_PREVIEW_PATH = "/.sim";

/**
 * Expo's dev server destroys every WebSocket upgrade outside its endpoint map (`@expo/cli` runServer-fork.ts),
 * which silently kills preview touch input. Claim `/.sim` and replay every other upgrade to the original listeners.
 */
function claimSimUpgrades(server, sim) {
    const inherited = server.listeners("upgrade");
    server.removeAllListeners("upgrade");

    server.on("upgrade", (req, socket, head) => {
        if (req.url?.startsWith(SIM_PREVIEW_PATH)) {
            sim.handleUpgrade(req, socket, head);
            return;
        }
        if (inherited.length === 0) {
            socket.destroy();
            return;
        }
        for (const listener of inherited) {
            listener.call(server, req, socket, head);
        }
    });
}

// Assigned after the wrappers because each returns a fresh config object.
finalConfig.server = {
    ...finalConfig.server,
    enhanceMiddleware: (metroMiddleware) => {
        const { simMiddleware } = require("serve-sim/middleware");
        const sim = simMiddleware({ basePath: SIM_PREVIEW_PATH });
        let claimed = false;

        return (req, res, next) => {
            if (!claimed && req.socket?.server) {
                claimed = true;
                claimSimUpgrades(req.socket.server, sim);
            }
            if (req.url?.startsWith(SIM_PREVIEW_PATH)) {
                return sim(req, res, () => metroMiddleware(req, res, next));
            }
            return metroMiddleware(req, res, next);
        };
    },
};

module.exports = finalConfig;
