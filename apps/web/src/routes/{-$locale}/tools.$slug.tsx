import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ComponentType } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, Prose, Questions } from "@/components/answers/article";
import { BudgetTool } from "@/components/tools/budget-tool";
import { InstallmentTool } from "@/components/tools/installment-tool";
import { RateTool } from "@/components/tools/rate-tool";
import { SplitTool } from "@/components/tools/split-tool";
import { SubscriptionTool } from "@/components/tools/subscription-tool";
import { getRates } from "@/lib/get-rates";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import { RATE_MARKETS } from "@/lib/rates";
import type { Rate, RateSlug } from "@/lib/rates";
import { ORGANIZATION_ID, answerTrail, faqPage, ldJson, pageMeta } from "@/lib/seo";

type ToolSlug = keyof ReturnType<typeof getIntlayer<"tools">>["pages"];

const CALCULATORS = {
    "50-30-20-budget-calculator": BudgetTool,
    "installment-calculator": InstallmentTool,
    "split-expenses-calculator": SplitTool,
    "subscription-cost-calculator": SubscriptionTool,
} satisfies Record<Exclude<ToolSlug, RateSlug>, ComponentType>;

export const Route = createFileRoute("/{-$locale}/tools/$slug")({
    component: Tool,
    loader: async ({ params }) => {
        const { slug } = params;
        if (!hasKey(getIntlayer("tools").pages, slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        const locale = localeFromParam(params.locale);
        const page = getIntlayer("tools", locale).pages[slug];
        const head = {
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
                    url: pageUrl(`/tools/${slug}`, locale),
                }),
                ldJson(faqPage(page.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "tools", slug, page.title)),
            ],
        };
        return { head, rates: hasKey(RATE_MARKETS, slug) ? await getRates({ data: slug }) : null, slug };
    },
    head: ({ loaderData }) => loaderData?.head ?? {},
});

function Calculator({ rates, slug }: { rates: readonly Rate[] | null; slug: ToolSlug }) {
    if (hasKey(RATE_MARKETS, slug)) {
        return <RateTool rates={rates} slug={slug} />;
    }
    const Current = CALCULATORS[slug];
    return <Current />;
}

function Tool() {
    const { rates, slug } = Route.useLoaderData();
    const { labels, pages } = useIntlayer("tools");
    const answers = useIntlayer("answers");
    const { locale } = useLocale();
    const page = pages[slug];
    return (
        <Article
            badges={false}
            hub="/tools"
            lead={page.lead}
            related={page.related}
            sections={[
                {
                    body: <Prose paragraphs={page.method} />,
                    id: "method",
                    title: labels.method,
                },
                { body: <Questions items={page.faq} />, id: "questions", title: answers.labels.questions },
            ]}
            title={page.title}
        >
            <div className="ph-no-capture">
                <Calculator key={locale} rates={rates} slug={slug} />
            </div>
        </Article>
    );
}
