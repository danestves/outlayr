import { Locales } from "intlayer";
import type { IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
    internationalization: {
        defaultLocale: Locales.ENGLISH,
        locales: [
            Locales.ENGLISH,
            Locales.GERMAN,
            Locales.SPANISH,
            Locales.SPANISH_SPAIN,
            Locales.FRENCH,
            Locales.PORTUGUESE,
            Locales.PORTUGUESE_PORTUGAL,
            Locales.ITALIAN,
            Locales.DUTCH,
            Locales.JAPANESE,
            Locales.KOREAN,
        ],
        requiredLocales: [
            Locales.ENGLISH,
            Locales.GERMAN,
            Locales.SPANISH,
            Locales.FRENCH,
            Locales.PORTUGUESE,
            Locales.ITALIAN,
            Locales.DUTCH,
            Locales.JAPANESE,
            Locales.KOREAN,
        ],
        strictMode: "strict",
    },
    routing: {
        enableProxy: false,
        mode: "no-prefix",
    },
};

export default config;
