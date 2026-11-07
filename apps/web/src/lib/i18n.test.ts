import { expect, it } from "vite-plus/test";

import about from "../content/about.content";
import answers from "../content/answers.content";
import appUi from "../content/app-ui.content";
import demo from "../content/demo.content";
import filmCapture from "../content/film-capture.content";
import filmChaos from "../content/film-chaos.content";
import filmLog from "../content/film-log.content";
import filmMonth from "../content/film-month.content";
import filmSorted from "../content/film-sorted.content";
import home from "../content/home.content";
import site from "../content/site.content";
import story from "../content/story.content";
import support from "../content/support.content";
import tools from "../content/tools.content";
import { TRANSLATED } from "./i18n";

const SHELL = [site.content];
const TOOL = [...SHELL, tools.content.labels, answers.content.labels];

// What each page translated into pt and fr renders, so a string missing pt or fr cannot fall back to English there.
const PAGE_CONTENT: Record<string, readonly unknown[]> = {
    "/": [
        ...SHELL,
        home.content,
        story.content,
        demo.content,
        appUi.content,
        filmCapture.content,
        filmChaos.content,
        filmLog.content,
        filmMonth.content,
        filmSorted.content,
        about.content.allGuides,
    ],
    "/guides": [...SHELL, answers.content.hubs.guides],
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
    "/support": [...SHELL, support.content],
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

it("translates every string a pt or fr page renders", () => {
    for (const [locale, paths] of Object.entries(TRANSLATED)) {
        for (const path of paths) {
            const content = PAGE_CONTENT[path];
            expect(content, `${path} has no PAGE_CONTENT entry`).toBeDefined();
            expect(content?.flatMap((node) => untranslated(node, locale, path))).toEqual([]);
        }
    }
});
