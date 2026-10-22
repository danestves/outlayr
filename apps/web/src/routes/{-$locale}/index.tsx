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
import type { Locale } from "@/lib/i18n";
import { useMotionScan } from "@/lib/motion";
import { faqPage, ldJson, mobileApp, pageMeta } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const AGENT_LINKS = [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/json"',
    '</llms.txt>; rel="service-doc"; type="text/plain"',
    '</.well-known/ai-catalog.json>; rel="ai-catalog"',
].join(", ");

function appGraph(locale: Locale) {
    const { extras, meta } = getIntlayer("home", locale);
    return {
        "@context": "https://schema.org",
        ...mobileApp(meta.description, {
            featureList: extras.map((extra) => `${extra.label}: ${extra.text}`),
            image: `${SITE_URL}${LANGUAGES[locale].image}`,
            url: SITE_URL,
        }),
    };
}

export const Route = createFileRoute("/{-$locale}/")({
    component: HomePage,
    headers: () => ({ Link: AGENT_LINKS }),
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { faq, meta } = getIntlayer("home", locale);
        return {
            links: [
                {
                    as: "image",
                    fetchPriority: "high",
                    href: HERO_POSTER.light,
                    media: "(prefers-color-scheme: light)",
                    rel: "preload",
                    type: "image/webp",
                },
                {
                    as: "image",
                    fetchPriority: "high",
                    href: HERO_POSTER.dark,
                    media: "(prefers-color-scheme: dark)",
                    rel: "preload",
                    type: "image/webp",
                },
            ],
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(appGraph(locale)), ldJson(faqPage(faq, LANGUAGES[locale].lang))],
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
