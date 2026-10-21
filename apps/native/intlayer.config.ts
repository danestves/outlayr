import { Locales } from "intlayer";
import type { IntlayerConfig } from "intlayer";

// Plain `es`, not `es-419`: devices report es-MX, es-AR and es-419 interchangeably and all must land on one catalogue.
const config: IntlayerConfig = {
    content: {
        contentDir: ["src/content"],
    },
    internationalization: {
        defaultLocale: Locales.ENGLISH,
        locales: [Locales.ENGLISH, Locales.SPANISH],
        requiredLocales: [Locales.ENGLISH, Locales.SPANISH],
        // A half-translated key fails the build instead of falling back to English on a device.
        strictMode: "strict",
    },
};

export default config;
