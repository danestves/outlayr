import { getIntlayer } from "intlayer";
import { intlayerPolyfill } from "react-native-intlayer";

import type { Language } from "./languages";
import { platformCopy } from "./platform-copy";
import type { Catalog } from "./translate";

/**
 * Type-only: Intlayer blocklists `*.content.*` in Metro (`react-native-intlayer/metro`), so a value import resolves
 * under tsx and tsc and then fails to bundle.
 */
type Accounts = typeof import("@/content/accounts.content").default;
type AiConsent = typeof import("@/content/ai-consent.content").default;
type Alerts = typeof import("@/content/alerts.content").default;
type Auth = typeof import("@/content/auth.content").default;
type Budgets = typeof import("@/content/budgets.content").default;
type Categories = typeof import("@/content/categories.content").default;
type Common = typeof import("@/content/common.content").default;
type Debts = typeof import("@/content/debts.content").default;
type Domain = typeof import("@/content/domain.content").default;
type Goals = typeof import("@/content/goals.content").default;
type ImportSheet = typeof import("@/content/import.content").default;
type Insights = typeof import("@/content/insights.content").default;
type Installments = typeof import("@/content/installments.content").default;
type Log = typeof import("@/content/log.content").default;
type Onboarding = typeof import("@/content/onboarding.content").default;
type Pro = typeof import("@/content/pro.content").default;
type Receipt = typeof import("@/content/receipt.content").default;
type Search = typeof import("@/content/search.content").default;
type Settings = typeof import("@/content/settings.content").default;
type SettingsAccount = typeof import("@/content/settings-account.content").default;
type SettingsData = typeof import("@/content/settings-data.content").default;
type SettingsFeatureLab = typeof import("@/content/settings-feature-lab.content").default;
type SettingsNotifications = typeof import("@/content/settings-notifications.content").default;
type SettingsWallet = typeof import("@/content/settings-wallet.content").default;
type Transaction = typeof import("@/content/transaction.content").default;
type Transfers = typeof import("@/content/transfers.content").default;
type Update = typeof import("@/content/update.content").default;
type Voice = typeof import("@/content/voice.content").default;
type Watch = typeof import("@/content/watch.content").default;

/** The flat map and the parity guard enumerate this, so a new `.content.ts` file must be added here. */
export const DICTIONARY_KEYS = [
    "accounts",
    "ai-consent",
    "alerts",
    "auth",
    "budgets",
    "categories",
    "common",
    "debts",
    "domain",
    "goals",
    "import",
    "insights",
    "installments",
    "log",
    "onboarding",
    "pro",
    "receipt",
    "search",
    "settings",
    "settings-account",
    "settings-data",
    "settings-feature-lab",
    "settings-notifications",
    "settings-wallet",
    "transaction",
    "transfers",
    "update",
    "voice",
    "watch",
] as const;

type Content =
    | Accounts["content"]
    | AiConsent["content"]
    | Alerts["content"]
    | Auth["content"]
    | Budgets["content"]
    | Categories["content"]
    | Common["content"]
    | Debts["content"]
    | Domain["content"]
    | Goals["content"]
    | ImportSheet["content"]
    | Insights["content"]
    | Installments["content"]
    | Log["content"]
    | Onboarding["content"]
    | Pro["content"]
    | Receipt["content"]
    | Search["content"]
    | Settings["content"]
    | SettingsAccount["content"]
    | SettingsData["content"]
    | SettingsFeatureLab["content"]
    | SettingsNotifications["content"]
    | SettingsWallet["content"]
    | Transaction["content"]
    | Transfers["content"]
    | Update["content"]
    | Voice["content"]
    | Watch["content"];

export type TranslationKey = keyof UnionToIntersection<Content>;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type PluralStem<K extends string> = K extends `${infer Stem}_other` ? Stem : never;

/** A plural is called by its stem (`t("budgets.days", { count })`), which is not a key of its own. */
export type TranslatableKey = TranslationKey | PluralStem<TranslationKey & string>;

/**
 * `@intlayer/core` reads `document.cookie` and `localStorage`, which React Native lacks. The polyfill only stubs
 * them when called, and `@/i18n` loads this module before `./context`, so the provider's call is too late.
 */
intlayerPolyfill();

function catalogFor(locale: Language): Catalog {
    const flat: Record<string, string> = {};
    for (const key of DICTIONARY_KEYS) {
        Object.assign(flat, getIntlayer(key, locale));
    }
    return platformCopy(flat);
}

export const EN = catalogFor("en");

let spanish: Catalog | undefined;

export const CATALOGS = {
    en: EN,
    get es() {
        spanish ??= catalogFor("es");
        return spanish;
    },
} satisfies Record<Language, Catalog>;
