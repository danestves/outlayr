import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { Pricing } from "@/components/home/pricing";
import { CONTAINER } from "@/lib/layout";
import { scanMotion } from "@/lib/motion";
import { usPrices } from "@/lib/pro-prices";
import { APP_ID, ldJson, pageMeta, proProduct, webPage } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/pricing")({
    component: PricingPage,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { meta } = getIntlayer("pricing", locale);
        const description = meta.description(usPrices(locale));
        return {
            meta: pageMeta(meta.title, description),
            scripts: [
                ldJson(webPage(locale, "/pricing", { mainEntity: { "@id": APP_ID }, name: meta.title })),
                ldJson(proProduct(locale, description)),
            ],
        };
    },
});

function PricingPage() {
    const { bank, cancel, capture, country, lead, prices, title } = useIntlayer("pricing");
    const { locale } = useLocale();
    return (
        <main className="pt-24" id="main" ref={scanMotion}>
            <header className={`${CONTAINER} mt-16`}>
                <h1
                    className="max-w-[680px] pb-2 text-4xl font-semibold tracking-tighter delay-100 md:text-6xl"
                    data-reveal
                >
                    {title}
                </h1>
                <p className="text-muted mt-6 max-w-[680px] text-lg delay-200 md:text-xl" data-reveal>
                    {lead}
                </p>
                <div className="mt-10 flex max-w-[65ch] flex-col gap-4 text-lg delay-200" data-reveal>
                    <p>
                        {prices(usPrices(locale))} {country}
                    </p>
                    <p>{capture}</p>
                    <p>
                        {cancel} {bank}
                    </p>
                </div>
            </header>
            <Pricing standalone />
        </main>
    );
}
