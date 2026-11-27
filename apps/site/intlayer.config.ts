import { Locales } from "intlayer";
import type { IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
    internationalization: {
        defaultLocale: Locales.ENGLISH,
        locales: [
            Locales.ENGLISH,
            Locales.SPANISH,
            Locales.PORTUGUESE,
            Locales.FRENCH,
            Locales.GERMAN,
            Locales.ITALIAN,
            Locales.DUTCH,
            Locales.JAPANESE,
            Locales.KOREAN,
        ],
        requiredLocales: [Locales.ENGLISH, Locales.SPANISH],
        strictMode: "strict",
    },
    routing: {
        enableProxy: false,
        mode: "prefix-no-default",
    },
};

export default config;
