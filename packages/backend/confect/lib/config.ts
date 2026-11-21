import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const text = (name: string) => Config.String(name).pipe(Config.option);

const secret = (name: string) => Config.Redacted(name).pipe(Config.option);

const MIN_WEBHOOK_AUTH_LENGTH = 32;
const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_NATIVE_APP_URL = "outlayr://";
const DEFAULT_MCP_CONSENT_URL = "https://app.tryoutlayr.com/connect";

export const convexSiteUrl = text("CONVEX_SITE_URL");

export const vapidConfig = Config.all({
    privateKey: Config.Redacted("VAPID_PRIVATE_KEY"),
    publicKey: Config.String("VAPID_PUBLIC_KEY"),
    subject: Config.String("VAPID_SUBJECT"),
}).pipe(Config.option);

export const siteUrl = Config.String("SITE_URL").pipe(
    Config.orElse(() => Config.String("CONVEX_SITE_URL")),
    Config.withDefault(DEFAULT_SITE_URL)
);

export const legacyWebOrigin = text("LEGACY_WEB_ORIGIN").pipe(Config.map(Option.filter((origin) => origin !== "")));

export const webOrigins = Config.all([siteUrl, legacyWebOrigin]).pipe(
    Config.map(([site, legacy]) => [site, ...Option.toArray(legacy)])
);

export const nativeAppUrl = Config.String("NATIVE_APP_URL").pipe(Config.withDefault(DEFAULT_NATIVE_APP_URL));

export const mcpConsentUrl = Config.String("MCP_CONSENT_URL").pipe(Config.withDefault(DEFAULT_MCP_CONSENT_URL));

const appleCredentials = Config.all({
    clientId: text("APPLE_CLIENT_ID"),
    keyId: text("APPLE_KEY_ID"),
    privateKey: secret("APPLE_PRIVATE_KEY"),
    teamId: text("APPLE_TEAM_ID"),
    webClientId: text("APPLE_WEB_CLIENT_ID"),
});

export const appleConfig = appleCredentials.pipe(
    Config.map(({ webClientId, ...required }) =>
        Option.map(Option.all(required), (apple) => ({
            ...apple,
            webClientId: Option.getOrElse(webClientId, () => apple.clientId),
        }))
    )
);

export const apnsConfig = Config.all({
    keyId: text("APNS_KEY_ID"),
    privateKey: secret("APNS_PRIVATE_KEY"),
    teamId: text("APNS_TEAM_ID"),
}).pipe(Config.map(Option.all));

const googleCredentials = Config.all({
    clientIdIos: text("GOOGLE_CLIENT_ID_IOS"),
    clientIdWeb: text("GOOGLE_CLIENT_ID_WEB"),
    clientSecret: secret("GOOGLE_CLIENT_SECRET"),
});

export const googleConfig = googleCredentials.pipe(Config.map(Option.all));

export const notionConfig = Config.all({
    clientId: text("NOTION_CLIENT_ID"),
    clientSecret: secret("NOTION_CLIENT_SECRET"),
}).pipe(Config.map(Option.all));

export const revenueCatSecretKey = secret("REVENUECAT_SECRET_KEY");

export const proAccounts = Config.String("PRO_ACCOUNTS").pipe(
    Config.withDefault(""),
    Config.map((value) =>
        value
            .split(",")
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => entry !== "")
    )
);

export const revenueCatMetricsConfig = Config.all({
    projectId: text("REVENUECAT_PROJECT_ID"),
    secretKey: secret("REVENUECAT_V2_SECRET_KEY"),
}).pipe(Config.map(Option.all));

export const stripeSecretKey = secret("STRIPE_SECRET_KEY");
export const revenueCatStripePublicKey = secret("REVENUECAT_STRIPE_PUBLIC_KEY");

export const gitHubToken = secret("GITHUB_TOKEN");

export const revenueCatWebhookAuth = Config.schema(
    Schema.Redacted(Schema.String.check(Schema.isMinLength(MIN_WEBHOOK_AUTH_LENGTH))),
    "REVENUECAT_WEBHOOK_AUTH"
).pipe(Config.option);

export const postHogProjectToken = secret("POSTHOG_PROJECT_TOKEN");

export const postHogConfig = Config.all({
    personalApiKey: secret("POSTHOG_PERSONAL_API_KEY"),
    projectId: text("POSTHOG_PROJECT_ID"),
}).pipe(Config.map(Option.all));

export const openExchangeRatesAppId = text("OXR_APP_ID");
export const cotizaveApiKey = secret("COTIZAVE_API_KEY");

export const numberOverride = (name: string) =>
    Config.String(name).pipe(
        Config.option,
        Config.map(
            Option.flatMap((raw) => {
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? Option.some(parsed) : Option.none();
            })
        )
    );

export const authSettings = Config.all({
    apple: appleConfig,
    convexSiteUrl,
    google: googleConfig,
    nativeAppUrl,
    notion: notionConfig,
    siteUrl,
    webOrigins,
});
