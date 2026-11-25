import { LANGUAGES, localeFromParam, pageUrl } from "@outlayr/shared/i18n";
import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ComponentType } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, Prose, Questions } from "@/components/answers/article";
import { BudgetTool } from "@/components/tools/budget-tool";
import { InstallmentTool } from "@/components/tools/installment-tool";
import { LoanTool } from "@/components/tools/loan-tool";
import { RateTool } from "@/components/tools/rate-tool";
import { SplitTool } from "@/components/tools/split-tool";
import { SubscriptionTool } from "@/components/tools/subscription-tool";
import { getRates } from "@/lib/get-rates";
import { hasKey } from "@/lib/has-key";
import { RATE_MARKETS, headlineValues } from "@/lib/rates";
import type { Rate, RateSlug } from "@/lib/rates";
import { ORGANIZATION_ID, TITLE_LIMIT, answerTrail, faqPage, ldJson, pageMeta } from "@/lib/seo";

type ToolSlug = keyof ReturnType<typeof getIntlayer<"tools">>["pages"];

const CALCULATORS = {
    "50-30-20-budget-calculator": BudgetTool,
    "installment-calculator": InstallmentTool,
    "loan-calculator": LoanTool,
    "split-expenses-calculator": SplitTool,
    "subscription-cost-calculator": SubscriptionTool,
} satisfies Record<Exclude<ToolSlug, RateSlug>, ComponentType>;

const CRYPTO_KINDS: ReadonlySet<Rate["kind"]> = new Set(["binance", "cripto"]);

const isFiat = (rate: Rate) => !CRYPTO_KINDS.has(rate.kind);

export const Route = createFileRoute("/{-$locale}/tools/$slug")({
    component: Tool,
    loader: async ({ params }) => {
        const { slug } = params;
        if (!hasKey(getIntlayer("tools").pages, slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        const locale = localeFromParam(params.locale);
        const dictionary = getIntlayer("tools", locale);
        const page = dictionary.pages[slug];
        const rateSlug = hasKey(RATE_MARKETS, slug) ? slug : null;
        const rates = rateSlug ? await getRates({ data: rateSlug }) : null;
        const values = rateSlug ? headlineValues(rateSlug, locale, rates) : null;
        const copy =
            values && "live" in page
                ? { description: page.live.description(values), title: page.live.title(values) }
                : null;
        const live = copy && copy.title.length <= TITLE_LIMIT ? copy : null;
        const head = {
            meta: pageMeta(
                live?.title ?? page.meta.title,
                live?.description ?? ("description" in page.meta ? page.meta.description : page.lead)
            ),
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
                ...(rateSlug && rates?.some(isFiat)
                    ? [
                          ldJson({
                              "@context": "https://schema.org",
                              "@graph": rates.filter(isFiat).map((rate) => ({
                                  "@type": "ExchangeRateSpecification",
                                  currency: rate.base,
                                  currentExchangeRate: {
                                      "@type": "UnitPriceSpecification",
                                      price: rate.rate,
                                      priceCurrency: RATE_MARKETS[rateSlug].currency,
                                  },
                                  name: dictionary.labels.rates.kinds[rate.kind],
                              })),
                          }),
                      ]
                    : []),
                ldJson(faqPage(page.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "tools", slug, page.title)),
            ],
        };
        return { head, live, rates, slug };
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
    const { live, rates, slug } = Route.useLoaderData();
    const { labels, pages } = useIntlayer("tools");
    const answers = useIntlayer("answers");
    const { locale } = useLocale();
    const page = pages[slug];
    return (
        <Article
            badges={false}
            hub="/tools"
            lead={live?.description ?? page.lead}
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
