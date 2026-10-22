import { useRouter } from "@tanstack/react-router";
import { getIntlayer, getLocalizedUrl } from "intlayer";
import { useEffect } from "react";

import { pageUrl } from "./i18n";
import type { Locale } from "./i18n";

export interface SitePage {
    description?: string;
    path: string;
    title: string;
}

const DIACRITICS = /\p{Diacritic}/gu;
const SPACES = /\s+/u;

export const fold = (text: string) => text.normalize("NFD").replaceAll(DIACRITICS, "").toLowerCase();

function sitePages(locale: Locale): SitePage[] {
    const home = getIntlayer("home", locale);
    const about = getIntlayer("about", locale);
    const support = getIntlayer("support", locale);
    const { notFound } = getIntlayer("site", locale);
    const { compare, guides, hubs } = getIntlayer("answers", locale);
    const tools = getIntlayer("tools", locale);
    return [
        { description: home.meta.description, path: "/", title: home.meta.title },
        { description: about.meta.description, path: "/about", title: about.meta.title },
        { description: support.meta.description, path: "/support", title: support.meta.title },
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

export function useAgentTools(locale: Locale) {
    const router = useRouter();
    useEffect(() => {
        const modelContext = document.modelContext ?? navigator.modelContext;
        if (!modelContext) {
            return;
        }
        const pages = sitePages(locale);
        const located = (page: SitePage) => ({ ...page, url: pageUrl(page.path, locale) });
        const { faq } = getIntlayer("home", locale);
        const { answers } = getIntlayer("support", locale);
        const controller = new AbortController();
        const options = { signal: controller.signal };
        void modelContext.registerTool(
            {
                annotations: { readOnlyHint: true },
                description:
                    "Search tryoutlayr.com, the site for Outlayr, a mobile expense tracker and budget app. Covers the product overview, how-to guides, comparisons with other budget apps, free money calculators, support, and legal pages. Returns each match's title, description, path, and URL. Leave the query empty to list every page.",
                execute: ({ query = "" }: { query?: string }) => searchPages(pages, query).map(located),
                inputSchema: {
                    properties: {
                        query: { description: "Words to look for, like 'receipt' or 'ynab'.", type: "string" },
                    },
                    type: "object",
                },
                name: "search_pages",
            },
            options
        );
        void modelContext.registerTool(
            {
                description: "Open a page of tryoutlayr.com in this tab. Takes a path returned by search_pages.",
                execute: async ({ path }: { path: string }) => {
                    const page = pages.find((candidate) => candidate.path === path);
                    if (!page) {
                        throw new Error(`No page at ${path}. Call search_pages for the list of paths.`);
                    }
                    await router.navigate({ href: getLocalizedUrl(page.path, locale) });
                    return located(page);
                },
                inputSchema: {
                    properties: {
                        path: {
                            description: "Site path, like /guides/budget-planner.",
                            enum: pages.map(({ path }) => path),
                            type: "string",
                        },
                    },
                    required: ["path"],
                    type: "object",
                },
                name: "open_page",
            },
            options
        );
        void modelContext.registerTool(
            {
                annotations: { readOnlyHint: true },
                description:
                    "Answers to common questions about Outlayr: what it is, what is free and what Pro adds, platforms, languages, privacy, and how to restore or cancel Pro, get a refund, and export or delete data.",
                execute: () => [...faq, ...answers],
                inputSchema: { properties: {}, type: "object" },
                name: "get_answers",
            },
            options
        );
        return () => controller.abort();
    }, [locale, router]);
}
