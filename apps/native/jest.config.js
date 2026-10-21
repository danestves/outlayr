const path = require("node:path");

const iosPreset = require("jest-expo/jest-preset");
const androidPreset = require("jest-expo/android/jest-preset");

// jest-expo mocks whichever expo-modules-core pnpm hoists, and with two copies in the graph that
// can be one the app never loads. Pin both to the copy the app's `expo` resolves.
const expoModulesCore = path.dirname(
    require.resolve("expo-modules-core/package.json", { paths: [path.dirname(require.resolve("expo/package.json"))] })
);

const ANDROID_TESTS = "**/*.android.test.ts?(x)";

/**
 * The transform comes from the platform's own preset: its babel caller is what inlines `Platform.OS`.
 * @param {typeof iosPreset} preset The platform's jest-expo preset.
 * @returns {import("jest").Config} One project, before its name and test match.
 */
const projectFor = (preset) => ({
    moduleNameMapper: {
        // jest-expo only maps `@/*` to `src/*`, so assets need their own rule ahead of that one.
        "^@/assets/(.*)$": "<rootDir>/assets/$1",
        "^react-native-worklets$": "react-native-worklets/src/mock",
        "^expo-modules-core$": expoModulesCore,
        "^expo-modules-core/(.*)$": `${expoModulesCore}/$1`,
    },
    resolver: "<rootDir>/jest/resolver.js",
    setupFiles: [
        "react-native-gesture-handler/jestSetup.js",
        "<rootDir>/jest/expo-observe-stub.js",
        "<rootDir>/jest/env-stub.js",
        "<rootDir>/jest/sqlite-change-listener-stub.js",
        "<rootDir>/jest/i18n-key-stub.js",
    ],
    // lucide-react-native ships ESM as .mjs, which jest-expo's `\.[jt]sx?$` transform never matches.
    transform: {
        ...preset.transform,
        "\\.mjs$": preset.transform["\\.[jt]sx?$"],
    },
    transformIgnorePatterns: [
        "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|uniwind|@legendapp/list|@hugeicons/react-native|drizzle-orm|intlayer|react-native-intlayer|dinero.js|number-flow-react-native|@t3-oss|convex|@convex-dev/better-auth|@better-auth|better-auth|@noble|jose|nanostores|panelui-native|lucide-react-native|@revenuecat|react-native-purchases|@material))",
    ],
});

/**
 * A `*.android.test.ts(x)` runs as Android, resolving `.android` siblings first, and stays out of the iOS run.
 * @type {import("jest").Config}
 */
module.exports = {
    globalSetup: "<rootDir>/jest/global-setup.js",
    projects: [
        {
            ...projectFor(iosPreset),
            displayName: "ios",
            preset: "jest-expo",
            testMatch: ["**/*.test.ts?(x)", `!${ANDROID_TESTS}`],
        },
        {
            ...projectFor(androidPreset),
            displayName: "android",
            preset: "jest-expo/android",
            testMatch: [ANDROID_TESTS],
        },
    ],
};
