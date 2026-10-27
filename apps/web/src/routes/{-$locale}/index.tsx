import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { Extras, Screens, Trust } from "@/components/home/details";
import { Features } from "@/components/home/features";
import { Guides } from "@/components/home/guides";
import { Hero } from "@/components/home/hero";
import { heroPoster } from "@/components/home/hero-poster";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pricing } from "@/components/home/pricing";
import { Problem } from "@/components/home/problem";
import { Closing, Questions, Tagline } from "@/components/home/questions";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { scanMotion } from "@/lib/motion";
import { faqPage, ldJson, pageMeta } from "@/lib/seo";

const AGENT_LINKS = [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/json"',
    '</llms.txt>; rel="service-doc"; type="text/plain"',
    '</.well-known/ai-catalog.json>; rel="ai-catalog"',
].join(", ");

export const Route = createFileRoute("/{-$locale}/")({
    component: HomePage,
    headers: () => ({ Link: AGENT_LINKS }),
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { faq, meta } = getIntlayer("home", locale);
        const poster = heroPoster(locale);
        return {
            links: (["light", "dark"] as const).map((variant) => ({
                as: "image",
                fetchPriority: "high" as const,
                href: poster.variants[variant].src,
                imageSizes: poster.sizes,
                imageSrcSet: poster.variants[variant].srcSet,
                media: `(prefers-color-scheme: ${variant})`,
                rel: "preload",
                type: "image/webp",
            })),
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(faqPage(faq, LANGUAGES[locale].lang))],
        };
    },
});

function HomePage() {
    return (
        <main id="main" ref={scanMotion}>
            <Hero />
            <Problem />
            <Tagline />
            <HowItWorks />
            <Features />
            <Screens />
            <Trust />
            <Extras />
            <Pricing />
            <Questions />
            <Guides />
            <Closing />
        </main>
    );
}
