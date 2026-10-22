import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ComponentType } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, Questions, nextAfter } from "@/components/answers/article";
import { BudgetTool } from "@/components/tools/budget-tool";
import { InstallmentTool } from "@/components/tools/installment-tool";
import { SplitTool } from "@/components/tools/split-tool";
import { SubscriptionTool } from "@/components/tools/subscription-tool";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import { ORGANIZATION_ID, answerTrail, faqPage, ldJson, pageMeta } from "@/lib/seo";

type ToolSlug = keyof ReturnType<typeof getIntlayer<"tools">>["pages"];

const CALCULATORS = {
    "50-30-20-budget-calculator": BudgetTool,
    "installment-calculator": InstallmentTool,
    "split-expenses-calculator": SplitTool,
    "subscription-cost-calculator": SubscriptionTool,
} satisfies Record<ToolSlug, ComponentType>;

export const Route = createFileRoute("/{-$locale}/tools/$slug")({
    component: Tool,
    loader: ({ params }) => {
        if (!hasKey(getIntlayer("tools").pages, params.slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        return params.slug;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const locale = localeFromParam(params.locale);
        const page = getIntlayer("tools", locale).pages[loaderData];
        return {
            meta: pageMeta(page.meta.title, page.lead),
            scripts: [
                ldJson({
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    applicationCategory: "FinanceApplication",
                    browserRequirements: "Requires JavaScript",
                    description: page.lead,
                    inLanguage: LANGUAGES[locale].lang,
                    isAccessibleForFree: true,
                    name: page.title,
                    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                    operatingSystem: "Any",
                    publisher: { "@id": ORGANIZATION_ID },
                    url: pageUrl(`/tools/${loaderData}`, locale),
                }),
                ldJson(faqPage(page.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "tools", loaderData, page.title)),
            ],
        };
    },
});

function Tool() {
    const slug = Route.useLoaderData();
    const { labels, pages } = useIntlayer("tools");
    const answers = useIntlayer("answers");
    const { locale } = useLocale();
    const page = pages[slug];
    const Calculator = CALCULATORS[slug];
    return (
        <Article
            hub="/tools"
            lead={page.lead}
            related={nextAfter(pages, slug, 3).map((other) => ({
                name: pages[other].title,
                slug: other,
                text: pages[other].lead,
                to: "/{-$locale}/tools/$slug",
            }))}
            sections={[
                {
                    body: (
                        <div className="text-muted mt-8 flex max-w-2xl flex-col gap-4 text-lg">
                            {page.method.map((paragraph) => (
                                <p data-reveal key={paragraph.value}>
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    ),
                    id: "method",
                    title: labels.method,
                },
                { body: <Questions items={page.faq} />, id: "questions", title: answers.labels.questions },
            ]}
            title={page.title}
        >
            <div className="ph-no-capture">
                <Calculator key={locale} />
            </div>
        </Article>
    );
}
