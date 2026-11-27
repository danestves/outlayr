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
        ],
        requiredLocales: [Locales.ENGLISH, Locales.GERMAN, Locales.SPANISH, Locales.FRENCH, Locales.PORTUGUESE],
        strictMode: "strict",
    },
    routing: {
        enableProxy: false,
        mode: "no-prefix",
    },
};

export default config;
