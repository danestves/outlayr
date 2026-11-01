import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { CLAUDE_FAST_MODEL_ID, CLAUDE_MODEL_ID } from "./models";

const text = (name: string) => Config.String(name).pipe(Config.option);

const secret = (name: string) => Config.Redacted(name).pipe(Config.option);

const MIN_WEBHOOK_AUTH_LENGTH = 32;
const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_NATIVE_APP_URL = "outlayr://";
const DEFAULT_MCP_CONSENT_URL = "https://tryoutlayr.com/connect";

export const anthropicApiKey = secret("ANTHROPIC_API_KEY");
export const elevenLabsApiKey = secret("ELEVENLABS_API_KEY");

export const claudeModelId = Config.String("CLAUDE_MODEL_ID").pipe(Config.withDefault(CLAUDE_MODEL_ID));
export const claudeFastModelId = Config.String("CLAUDE_FAST_MODEL_ID").pipe(Config.withDefault(CLAUDE_FAST_MODEL_ID));
export const claudeGroundedModelId = Config.String("CLAUDE_GROUNDED_MODEL_ID").pipe(
    Config.withDefault(CLAUDE_FAST_MODEL_ID)
);

export const convexSiteUrl = text("CONVEX_SITE_URL");

export const siteUrl = Config.String("SITE_URL").pipe(
    Config.orElse(() => Config.String("CONVEX_SITE_URL")),
    Config.withDefault(DEFAULT_SITE_URL)
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

export const emailConfig = Config.all({
    accountId: text("CLOUDFLARE_ACCOUNT_ID"),
    from: text("EMAIL_FROM"),
    token: secret("CLOUDFLARE_EMAIL_TOKEN"),
}).pipe(Config.map(Option.all));

export const revenueCatSecretKey = secret("REVENUECAT_SECRET_KEY");

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

export const r2Configured = Config.all([
    text("R2_BUCKET"),
    text("R2_ENDPOINT"),
    secret("R2_ACCESS_KEY_ID"),
    secret("R2_SECRET_ACCESS_KEY"),
]).pipe(Config.map((vars) => vars.every((value: Option.Option<unknown>) => Option.isSome(value))));

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
    email: emailConfig,
    google: googleConfig,
    nativeAppUrl,
    notion: notionConfig,
    siteUrl,
});
