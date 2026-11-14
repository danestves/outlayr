import { isPublished, pageUrl } from "@outlayr/shared/i18n";
import type { Locale } from "@outlayr/shared/i18n";
import type { useRouter } from "@tanstack/react-router";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getIntlayer, getLocalizedUrl } from "intlayer";

import { fold } from "./fold";

export interface SitePage {
    description?: string;
    path: string;
    title: string;
}

const SPACES = /\s+/u;

function sitePages(locale: Locale): SitePage[] {
    const home = getIntlayer("home", locale);
    const about = getIntlayer("about", locale);
    const brand = getIntlayer("brand", locale);
    const support = getIntlayer("support", locale);
    const open = getIntlayer("open", locale);
    const { notFound } = getIntlayer("site", locale);
    const { compare, guides, hubs } = getIntlayer("answers", locale);
    const tools = getIntlayer("tools", locale);
    return [
        { description: home.meta.description, path: "/", title: home.meta.title },
        { description: about.meta.description, path: "/about", title: about.meta.title },
        { description: brand.meta.description, path: "/brand", title: brand.meta.title },
        { description: support.meta.description, path: "/support", title: support.meta.title },
        { description: open.meta.description, path: "/open", title: open.meta.title },
        { path: "/privacy", title: notFound.pages.privacy },
        { path: "/terms", title: notFound.pages.terms },
        { path: "/delete-account", title: notFound.pages.deleteAccount },
        { description: hubs.guides.lead, path: "/guides", title: hubs.guides.meta.title },
        { description: hubs.compare.lead, path: "/compare", title: hubs.compare.meta.title },
        { description: tools.hub.lead, path: "/tools", title: tools.hub.meta.title },
        ...Object.entries(guides).map(([slug, guide]) => ({
            description: guide.lead,
            path: `/guides/${slug}`,
            title: guide.meta.title,
        })),
        ...Object.entries(compare).map(([slug, page]) => ({
            description: page.summary,
            path: `/compare/${slug}`,
            title: page.meta.title,
        })),
        ...Object.entries(tools.pages).map(([slug, page]) => ({
            description: page.lead,
            path: `/tools/${slug}`,
            title: page.meta.title,
        })),
    ];
}

export function searchPages(pages: readonly SitePage[], query: string): SitePage[] {
    const words = fold(query).split(SPACES).filter(Boolean);
    return pages.filter((page) => {
        const text = fold(`${page.title} ${page.description ?? ""}`);
        return words.every((word) => text.includes(word));
    });
}

const located = (page: SitePage, locale: Locale) => ({ ...page, url: pageUrl(page.path, locale) });

export class PageNotFoundError extends Schema.TaggedError<PageNotFoundError>()("PageNotFoundError", {
    path: Schema.String,
}) {
    override get message(): string {
        return `No page at ${this.path}. Call search_pages for the list of paths.`;
    }
}

const openPage = Effect.fn("AgentTools.openPage")(function* openPage(
    router: ReturnType<typeof useRouter>,
    locale: Locale,
    pages: readonly SitePage[],
    path: string
) {
    const page = pages.find((candidate) => candidate.path === path);
    if (!page) {
        return yield* new PageNotFoundError({ path });
    }
    yield* Effect.promise(() => router.navigate({ href: getLocalizedUrl(page.path, locale) }));
    return located(page, locale);
});

export function publishedPages(locale: Locale): SitePage[] {
    return sitePages(locale).filter((page) => isPublished(page.path, locale));
}

export function searchSite(locale: Locale, query: string) {
    return searchPages(publishedPages(locale), query).map((page) => located(page, locale));
}

export function openSitePage(router: ReturnType<typeof useRouter>, locale: Locale, path: string) {
    return Effect.runPromise(openPage(router, locale, publishedPages(locale), path));
}

export function siteAnswers(locale: Locale) {
    const { faq } = getIntlayer("home", locale);
    const { answers } = getIntlayer("support", locale);
    return [...faq, ...answers];
}
