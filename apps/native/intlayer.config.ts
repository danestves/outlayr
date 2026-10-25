import { Locales } from "intlayer";
import type { IntlayerConfig } from "intlayer";

// Plain `es` and `pt`: devices report es-MX, es-AR and es-419 interchangeably and all must land on one catalogue.
// The `pt` copy is Brazilian, as Apple's own `pt.lproj` is; pt-PT devices read it too.
const config: IntlayerConfig = {
    content: {
        contentDir: ["src/content"],
    },
    internationalization: {
        defaultLocale: Locales.ENGLISH,
        locales: [Locales.ENGLISH, Locales.SPANISH, Locales.PORTUGUESE],
        requiredLocales: [Locales.ENGLISH, Locales.SPANISH, Locales.PORTUGUESE],
        // A half-translated key fails the build instead of falling back to English on a device.
        strictMode: "strict",
    },
};

export default config;
