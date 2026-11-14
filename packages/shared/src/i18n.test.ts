import { expect, test } from "vite-plus/test";

import { sitePageUrl } from "./i18n";

test.each([
    ["/", "en", "https://tryoutlayr.com/"],
    ["/", "es", "https://tryoutlayr.com/es"],
    ["/terms", "es", "https://tryoutlayr.com/es/terms"],
    ["/privacy#ai", "fr", "https://tryoutlayr.com/fr/privacy#ai"],
    ["/blog", "pt", "https://tryoutlayr.com/blog"],
] as const)("links %s in %s to %s", (path, locale, url) => {
    expect(sitePageUrl(path, locale)).toBe(url);
});
