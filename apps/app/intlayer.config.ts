import { Locales } from "intlayer";
import type { IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
    internationalization: {
        defaultLocale: Locales.ENGLISH,
        locales: [Locales.ENGLISH, Locales.SPANISH, Locales.PORTUGUESE, Locales.FRENCH],
        requiredLocales: [Locales.ENGLISH, Locales.SPANISH],
        strictMode: "strict",
    },
    routing: {
        enableProxy: false,
        mode: "no-prefix",
    },
};

export default config;
