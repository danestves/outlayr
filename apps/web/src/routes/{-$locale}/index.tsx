import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { Extras, Screens, Trust } from "@/components/home/details";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";
import { HERO_POSTER } from "@/components/home/hero-poster";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pricing } from "@/components/home/pricing";
import { Problem } from "@/components/home/problem";
import { Closing, Questions, Tagline } from "@/components/home/questions";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { useMotionScan } from "@/lib/motion";
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
        return {
            links: (["light", "dark"] as const).map((variant) => ({
                as: "image",
                fetchPriority: "high" as const,
                href: HERO_POSTER.variants[variant].src,
                imageSizes: HERO_POSTER.sizes,
                imageSrcSet: HERO_POSTER.variants[variant].srcSet,
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
    useMotionScan();
    return (
        <main id="main">
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
            <Closing />
        </main>
    );
}
