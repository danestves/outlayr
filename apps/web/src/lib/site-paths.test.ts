import { locales } from "intlayer";
import { expect, it, vi } from "vite-plus/test";

import about from "../content/about.content";
import answers from "../content/answers.content";
import brand from "../content/brand.content";
import home from "../content/home.content";
import open from "../content/open.content";
import site from "../content/site.content";
import support from "../content/support.content";
import tools from "../content/tools.content";
import type { Locale } from "./i18n";
import { publishedSitePaths } from "./site-paths";

const DICTIONARIES = { about, answers, brand, home, open, site, support, tools };

vi.mock("intlayer", async (importOriginal) => {
    const actual = await importOriginal<typeof import("intlayer")>();
    return {
        ...actual,
        getIntlayer: (key: keyof typeof DICTIONARIES, locale: Locale) =>
            actual.getDictionary(DICTIONARIES[key], locale),
    };
});

it.each(locales)("open_page lists every page published in %s", async (locale) => {
    const { publishedPages } = await import("./agent-tools");
    expect(publishedSitePaths(locale)).toEqual(publishedPages(locale).map(({ path }) => path));
});
