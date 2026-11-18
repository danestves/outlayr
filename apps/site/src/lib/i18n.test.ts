import { TRANSLATED } from "@outlayr/shared/i18n";
import { expect, it } from "vite-plus/test";

import about from "../content/about.content";
import answers from "../content/answers.content";
import appUi from "../content/app-ui.content";
import brand from "../content/brand.content";
import demo from "../content/demo.content";
import home from "../content/home.content";
import horizon from "../content/horizon.content";
import open from "../content/open.content";
import pricing from "../content/pricing.content";
import site from "../content/site.content";
import story from "../content/story.content";
import support from "../content/support.content";
import tools from "../content/tools.content";

const SHELL = [site.content];
const TOOL = [...SHELL, tools.content.labels, answers.content.labels];

// What each gated page renders, so a string missing its locale cannot fall back to English there.
const PAGE_CONTENT: Record<string, readonly unknown[]> = {
    "/": [...SHELL, home.content, horizon.content, story.content, demo.content, appUi.content, pricing.content.more],
    "/pricing": [
        ...SHELL,
        pricing.content,
        home.content.limits,
        home.content.plansCopy,
        home.content.proOnly,
        story.content.pricing,
    ],
    "/about": [...SHELL, about.content],
    "/brand": [...SHELL, brand.content],
    "/guides": [...SHELL, answers.content.hubs.guides],
    "/guides/best-budget-apps-canada": [
        ...SHELL,
        answers.content.labels,
        answers.content.guides["best-budget-apps-canada"],
    ],
    "/guides/best-budget-apps-france": [
        ...SHELL,
        answers.content.labels,
        answers.content.guides["best-budget-apps-france"],
    ],
    "/guides/best-expense-tracker-apps-brazil": [
        ...SHELL,
        answers.content.labels,
        answers.content.guides["best-expense-tracker-apps-brazil"],
    ],
    "/guides/expense-tracker-template": [
        ...SHELL,
        answers.content.labels,
        answers.content.guides["expense-tracker-template"],
    ],
    "/compare": [
        ...SHELL,
        answers.content.hubs.compare,
        ...Object.values(answers.content.compare).map((page) => [page.rival, page.site, page.summary]),
    ],
    ...Object.fromEntries(
        Object.entries(answers.content.compare).map(([slug, page]) => [
            `/compare/${slug}`,
            [...SHELL, answers.content.labels, page],
        ])
    ),
    "/delete-account": SHELL,
    "/open": [...SHELL, open.content],
    "/privacy": SHELL,
    "/support": [...SHELL, support.content],
    "/terms": SHELL,
    "/tools": [...TOOL, tools.content.hub],
    "/tools/50-30-20-budget-calculator": [...TOOL, tools.content.pages["50-30-20-budget-calculator"]],
    "/tools/installment-calculator": [...TOOL, tools.content.pages["installment-calculator"]],
    "/tools/split-expenses-calculator": [...TOOL, tools.content.pages["split-expenses-calculator"]],
    "/tools/subscription-cost-calculator": [...TOOL, tools.content.pages["subscription-cost-calculator"]],
};

function untranslated(node: unknown, locale: string, path: string): string[] {
    if (typeof node !== "object" || node === null) {
        return [];
    }
    if ("nodeType" in node && node.nodeType === "translation" && "translation" in node) {
        const translations = node.translation as Record<string, unknown>;
        return locale in translations ? untranslated(translations[locale], locale, path) : [path];
    }
    return Object.entries(node).flatMap(([key, child]) => untranslated(child, locale, `${path}.${key}`));
}

it("translates every string a gated page renders", () => {
    for (const [locale, paths] of Object.entries(TRANSLATED)) {
        for (const path of paths) {
            const content = PAGE_CONTENT[path];
            expect(content, `${path} has no PAGE_CONTENT entry`).toBeDefined();
            expect(content?.flatMap((node) => untranslated(node, locale, path))).toEqual([]);
        }
    }
});
