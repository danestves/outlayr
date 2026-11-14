import mono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { Extras, Screens, Trust } from "@/components/home/details";
import { Features } from "@/components/home/features";
import { Guides } from "@/components/home/guides";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pricing } from "@/components/home/pricing";
import { Problem } from "@/components/home/problem";
import { Closing, Questions, Tagline } from "@/components/home/questions";
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
        return {
            links: [{ as: "font", crossOrigin: "anonymous", href: mono, rel: "preload", type: "font/woff2" }],
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
