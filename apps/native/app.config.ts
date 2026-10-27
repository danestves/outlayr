import "dotenv/config";
import type { ConfigContext, ExpoConfig } from "expo/config";

import type { AndroidShortcut } from "./plugins/with-android-shortcuts";
import type { AndroidWidgetCopy } from "./plugins/with-android-widgets";

const buildProfile = process.env.EAS_BUILD_PROFILE;
const isProduction = buildProfile === "production";

// Set by `.github/workflows/eas-build.yml`. Local builds fall back to Expo's 1.
const buildNumber = process.env.BUILD_NUMBER;

const PROJECT_ID = "f076a9e9-ec12-464d-85eb-772c4d0efce5";

const UPDATES_URL = "https://ota.hephaestus.sh/manifest";

const APP_GROUP = "group.com.tryoutlayr.app";

const IOS_DEPLOYMENT_TARGET = "18.0";

const ALTERNATE_ICONS = ["OutlayrInk", "OutlayrHairline", "OutlayrMono", "OutlayrEmboss"];

const WIDGETS = [
    {
        description: "Today's spending, and one tap to add an entry.",
        displayName: "Log an Expense",
        ios: {
            initialLayout: "src/widgets/log.tsx",
            supportedFamilies: ["systemSmall", "accessoryCircular", "accessoryRectangular", "accessoryInline"],
        },
        android: null,
        name: "Log",
    },
    {
        description: "What is left in your overall budget, and how far into the period you are.",
        displayName: "Budget",
        ios: {
            configuration: {
                parameters: {
                    budget: {
                        default: "auto",
                        title: "Budget",
                        type: "enum",
                        values: [
                            { name: "Automatic", value: "auto" },
                            { name: "Overall budget", value: "overall" },
                            { name: "Closest to its limit", value: "worst" },
                        ],
                    },
                },
                title: "Budget",
            },
            initialLayout: "src/widgets/budget.tsx",
            supportedFamilies: [
                "systemSmall",
                "systemMedium",
                "accessoryCircular",
                "accessoryRectangular",
                "accessoryInline",
            ],
        },
        android: null,
        name: "Budget",
    },
    {
        description: "Your most recent entries, newest first.",
        displayName: "Recent Entries",
        ios: {
            configuration: {
                parameters: {
                    measure: {
                        default: "spent",
                        title: "Figure",
                        type: "enum",
                        values: [
                            { name: "Spent", value: "spent" },
                            { name: "Income", value: "income" },
                            { name: "Net", value: "net" },
                        ],
                    },
                    period: {
                        default: "today",
                        title: "Period",
                        type: "enum",
                        values: [
                            { name: "Today", value: "today" },
                            { name: "This week", value: "week" },
                            { name: "This month", value: "month" },
                            { name: "This year", value: "year" },
                        ],
                    },
                },
                title: "Recent Entries",
            },
            initialLayout: "src/widgets/ledger.tsx",
            supportedFamilies: ["systemMedium", "systemLarge", "accessoryRectangular", "accessoryInline"],
        },
        android: null,
        name: "Ledger",
    },
    {
        description: "Spend, income and net for the period, with where the money went.",
        displayName: "Insights",
        ios: {
            configuration: {
                parameters: {
                    period: {
                        default: "app",
                        title: "Period",
                        type: "enum",
                        values: [
                            { name: "Match the app", value: "app" },
                            { name: "This week", value: "week" },
                            { name: "This month", value: "month" },
                            { name: "This year", value: "year" },
                        ],
                    },
                },
                title: "Insights",
            },
            initialLayout: "src/widgets/insights.tsx",
            supportedFamilies: ["systemSmall", "systemMedium"],
        },
        android: null,
        name: "Insights",
    },
];

/** `displayName` and `description` here are the English picker copy; the plugin writes the rest. */
const ANDROID_WIDGETS = [
    {
        description: {
            en: "Your balance, and one tap to log by amount, voice or receipt.",
            es: "Tu saldo, y un toque para registrar por monto, voz o recibo.",
            fr: "Votre solde, et une touche pour saisir par montant, voix ou ticket.",
            pt: "Seu saldo, e um toque para registrar por valor, voz ou recibo.",
        },
        displayName: { en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" },
        name: "Wallet",
        size: { minHeight: 110, minWidth: 250, targetCellHeight: 2, targetCellWidth: 4 },
    },
    {
        description: {
            en: "What you spent today, with quick ways to log.",
            es: "Lo que gastaste hoy, con formas rápidas de registrar.",
            fr: "Vos dépenses du jour, avec des saisies rapides.",
            pt: "O que você gastou hoje, com formas rápidas de registrar.",
        },
        displayName: { en: "Spent Today", es: "Gastado hoy", fr: "Dépensé aujourd'hui", pt: "Gasto hoje" },
        name: "Today",
        size: { minHeight: 110, minWidth: 110, targetCellHeight: 2, targetCellWidth: 2 },
    },
    {
        description: {
            en: "Balance, today's spending and what is left in your budget.",
            es: "Saldo, el gasto de hoy y lo que queda del presupuesto.",
            fr: "Solde, dépenses du jour et reste du budget.",
            pt: "Saldo, gasto de hoje e o que resta do orçamento.",
        },
        displayName: { en: "Overview", es: "Resumen", fr: "Aperçu", pt: "Resumo" },
        name: "Overview",
        size: { minHeight: 110, minWidth: 250, targetCellHeight: 2, targetCellWidth: 4 },
    },
] satisfies (AndroidWidgetCopy & { size: object })[];

type QuickAction = AndroidShortcut & { readonly iosIcon: string };

const QUICK_ACTIONS = [
    {
        glyph: "add",
        href: "outlayr://new",
        id: "log-expense",
        iosIcon: "symbol:plus.circle.fill",
        title: {
            en: "Log Expense",
            es: "Registrar gasto",
            fr: "Saisir une dépense",
            pt: "Registrar despesa",
            "pt-PT": "Registar despesa",
        },
    },
    {
        glyph: "income",
        href: "outlayr://new?income=1",
        id: "log-income",
        iosIcon: "symbol:arrow.down.circle.fill",
        title: {
            en: "Log Income",
            es: "Registrar ingreso",
            fr: "Saisir un revenu",
            pt: "Registrar receita",
            "pt-PT": "Registar receita",
        },
    },
    {
        glyph: "search",
        href: "outlayr://search",
        id: "search",
        iosIcon: "symbol:magnifyingglass",
        title: { en: "Search Entries", es: "Buscar", fr: "Rechercher", pt: "Buscar", "pt-PT": "Pesquisar" },
    },
    {
        glyph: "budgets",
        href: "outlayr://budgets",
        id: "budgets",
        iosIcon: "symbol:chart.pie.fill",
        title: { en: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos", "pt-PT": "Orçamentos" },
    },
] as const satisfies readonly QuickAction[];

const GOOGLE_CLIENT_SUFFIX = /\.apps\.googleusercontent\.com$/i;

function googleIosUrlScheme(clientId: string | undefined): string {
    if (!clientId) {
        return "com.googleusercontent.apps.placeholder";
    }
    if (clientId.startsWith("com.googleusercontent.apps.")) {
        return clientId;
    }
    return `com.googleusercontent.apps.${clientId.replace(GOOGLE_CLIENT_SUFFIX, "")}`;
}

const getConfig = ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    android: {
        adaptiveIcon: {
            backgroundColor: "#f2f0ea",
            foregroundImage: "./assets/images/adaptive-icon.png",
            monochromeImage: "./assets/images/adaptive-icon-monochrome.png",
        },
        // WRITE_EXTERNAL_STORAGE is not blocked: the camera needs it below Android 10,
        // so `with-android-capture` caps it instead.
        blockedPermissions: [
            "android.permission.SYSTEM_ALERT_WINDOW",
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.READ_MEDIA_IMAGES",
            "android.permission.READ_MEDIA_VIDEO",
            "com.google.android.c2dm.permission.RECEIVE",
        ],
        package: "com.tryoutlayr.app",
        versionCode: buildNumber ? Number(buildNumber) : undefined,
    },
    experiments: {
        inlineModules: {
            watchedDirectories: ["app-intents"],
        },
        reactCompiler: true,
        typedRoutes: true,
    },
    extra: {
        appGroup: APP_GROUP,
        eas: {
            projectId: PROJECT_ID,
        },
        primaryAppIcon: isProduction ? "Outlayr" : "OutlayrTesting",
        whatsNew: process.env.UPDATE_MESSAGE ?? null,
    },
    ios: {
        appleTeamId: "8ZB3YXDU7V",
        buildNumber,
        bundleIdentifier: "com.tryoutlayr.app",
        deploymentTarget: IOS_DEPLOYMENT_TARGET,
        entitlements: {
            "com.apple.security.application-groups": [APP_GROUP],
        },
        icon: isProduction ? "./assets/Outlayr.icon" : "./assets/OutlayrTesting.icon",
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
        },
        usesAppleSignIn: true,
    },
    locales: {
        es: "./locales/es.json",
        "es-ES": "./locales/es-ES.json",
        fr: "./locales/fr.json",
        pt: "./locales/pt.json",
        "pt-PT": "./locales/pt-PT.json",
    },
    name: "Outlayr",
    owner: "danestves-llc",
    platforms: ["ios", "android"],
    plugins: [
        "expo-router",
        ["expo-localization", { supportedLocales: ["en", "es", "es-ES", "fr", "pt", "pt-PT"] }],
        "expo-image",
        "expo-sqlite",
        [
            "expo-build-properties",
            {
                android: {
                    enableMinifyInReleaseBuilds: true,
                    enableShrinkResourcesInReleaseBuilds: true,
                },
                ios: {
                    deploymentTarget: IOS_DEPLOYMENT_TARGET,
                },
            },
        ],
        [
            "expo-widgets",
            {
                enableAndroid: true,
                groupIdentifier: APP_GROUP,
                widgets: [
                    ...WIDGETS,
                    ...ANDROID_WIDGETS.map(({ description, displayName, name, size }) => ({
                        android: {
                            ...size,
                            initialLayout: `src/widgets/android/${name.toLowerCase()}.tsx`,
                            resizeMode: "both",
                        },
                        description: description.en,
                        displayName: displayName.en,
                        ios: null,
                        name,
                    })),
                ],
            },
        ],
        "@bacons/apple-targets",
        [
            "expo-quick-actions",
            {
                iosActions: QUICK_ACTIONS.map((action) => ({
                    icon: action.iosIcon,
                    id: action.id,
                    params: { href: action.href },
                    title: action.title.en,
                })),
            },
        ],
        ["./plugins/with-android-shortcuts.ts", { shortcuts: QUICK_ACTIONS }],
        ["./plugins/with-android-widgets.ts", { widgets: ANDROID_WIDGETS }],
        [
            "expo-splash-screen",
            {
                // Must equal `--background`: the splash hands off without a crossfade, so a near miss flashes.
                backgroundColor: "#f2f0ea",
                dark: {
                    backgroundColor: "#17150f",
                    image: "./assets/images/splash-icon-dark.png",
                },
                image: "./assets/images/splash-icon.png",
                imageWidth: 200,
            },
        ],
        "expo-system-ui",
        "expo-apple-authentication",
        "expo-secure-store",
        "expo-web-browser",
        [
            "react-native-nitro-google-signin",
            {
                iosUrlScheme: googleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS),
            },
        ],
        [
            "expo-image-picker",
            {
                cameraPermission:
                    "Outlayr uses the camera to scan a receipt or attach a photo to a transaction. Scanned photos go to Anthropic to read them. Attached photos don't.",
                photosPermission:
                    "Outlayr uses your photos to set a transaction's logo, attach a photo to it, or scan a receipt or installment plan. Scanned photos go to Anthropic to read them. The others don't.",
            },
        ],
        [
            "expo-local-authentication",
            {
                faceIDPermission: "Outlayr uses Face ID to unlock your ledger.",
            },
        ],
        [
            "expo-audio",
            {
                // The default adds the `audio` background mode, which App Review rejects as unused (2.5.4).
                enableBackgroundPlayback: false,
                microphonePermission:
                    "Outlayr listens while you speak an entry. The recording goes to ElevenLabs to write it down for you.",
                recordAudioAndroid: true,
            },
        ],
        [
            "expo-notifications",
            {
                // Android's status bar draws only the alpha, so the asset is the mark in white.
                color: "#c2371b",
                icon: "./assets/images/notification-icon.png",
            },
        ],
        [
            "./plugins/with-alternate-icons.ts",
            {
                icons: ALTERNATE_ICONS.map((name) => `./assets/${name}.icon`),
            },
        ],
        "./plugins/with-android-capture.ts",
        ["posthog-react-native/expo", { skipOnConflict: true }],
        "./plugins/with-android-material-theme.ts",
        [
            "react-native-nano-icons",
            {
                symbolSets: ["tab-symbols", "toolbar-symbols", "menu-symbols"].map((dir) => ({
                    inputDir: `./assets/${dir}`,
                })),
            },
        ],
        "./plugins/with-android-keep-nano-icons.ts",
    ],
    // Fingerprint, not appVersion: config plugins change native code without a version bump,
    // and an update served to a binary with a different native side crashes at launch.
    runtimeVersion: { policy: "fingerprint" },
    scheme: "outlayr",
    slug: "outlayr",
    updates: buildProfile
        ? {
              codeSigningCertificate: "./certs/certificate.pem",
              codeSigningMetadata: { alg: "rsa-v1_5-sha256", keyid: "main" },
              requestHeaders: { "expo-app-id": PROJECT_ID, "expo-channel-name": buildProfile },
              url: UPDATES_URL,
          }
        : { url: UPDATES_URL },
    userInterfaceStyle: "automatic",
    version: process.env.APP_VERSION ?? "1.0.0",
});

export default getConfig;
