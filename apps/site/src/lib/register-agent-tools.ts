import type { Locale } from "@outlayr/shared/i18n";
import { defaultLocale, getLocaleFromPath } from "intlayer";

import type { getRouter } from "../router";
import { publishedSitePaths } from "./site-paths";

type Router = ReturnType<typeof getRouter>;

const loadAgentTools = () => import("./agent-tools");

// Runs from getRouter, before hydration, so agents that check for WebMCP tools at page load find them.
export function registerAgentTools(router: Router) {
    const modelContext = document.modelContext ?? navigator.modelContext;
    if (!modelContext) {
        return;
    }
    let locale = getLocaleFromPath(window.location.pathname) ?? defaultLocale;
    let controller = registerTools(modelContext, router, locale);
    router.subscribe("onResolved", ({ toLocation }) => {
        const next = getLocaleFromPath(toLocation.pathname) ?? defaultLocale;
        if (next !== locale) {
            controller.abort();
            locale = next;
            controller = registerTools(modelContext, router, locale);
        }
    });
}

function registerTools(modelContext: ModelContext, router: Router, locale: Locale) {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void modelContext.registerTool(
        {
            annotations: { readOnlyHint: true },
            description:
                "Search tryoutlayr.com, the site for Outlayr, a mobile expense tracker and budget app. Covers the product overview, how-to guides, comparisons with other budget apps, free money calculators, support, and legal pages. Returns each match's title, description, path, and URL. Leave the query empty to list every page.",
            execute: async ({ query = "" }: { query?: string }) => {
                const { searchSite } = await loadAgentTools();
                return searchSite(locale, query);
            },
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
                const { openSitePage } = await loadAgentTools();
                return openSitePage(router, locale, path);
            },
            inputSchema: {
                properties: {
                    path: {
                        description: "Site path, like /guides/budget-planner.",
                        enum: publishedSitePaths(locale),
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
            execute: async () => {
                const { siteAnswers } = await loadAgentTools();
                return siteAnswers(locale);
            },
            inputSchema: { properties: {}, type: "object" },
            name: "get_answers",
        },
        options
    );
    return controller;
}
