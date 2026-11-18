import mono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { Away } from "@/components/home/away";
import { Capture } from "@/components/home/capture";
import { Dawn } from "@/components/home/dawn";

import "@/components/home/horizon.css";
import { InstallBar } from "@/components/home/install-bar";
import { Night } from "@/components/home/night";
import { Sunrise } from "@/components/home/sunrise";
import { Sunset } from "@/components/home/sunset";
import { watchGround } from "@/lib/ground";
import { scanMotion } from "@/lib/motion";
import { getWeekProof } from "@/lib/open-stats";
import { faqPage, ldJson, pageMeta } from "@/lib/seo";

const AGENT_LINKS = [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/json"',
    '</llms.txt>; rel="service-doc"; type="text/plain"',
    '</.well-known/ai-catalog.json>; rel="ai-catalog"',
].join(", ");

export const Route = createFileRoute("/{-$locale}/")({
    component: HomePage,
    loader: () => getWeekProof(),
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

function navLine(nav: HTMLElement) {
    const { height, top } = nav.getBoundingClientRect();
    return top + height / 2;
}

function home(main: HTMLElement | null) {
    if (!main) {
        return;
    }
    const motion = scanMotion();
    const nav = document.querySelector<HTMLElement>("[data-site-nav]");
    const ground = nav ? watchGround(nav, () => navLine(nav)) : undefined;
    return () => {
        motion();
        ground?.();
    };
}

function HomePage() {
    return (
        <main className="hz-page" data-sky="day" id="main" ref={home}>
            <Dawn />
            <div className="hz-sheet">
                <Capture />
                <Away />
            </div>
            <Sunset />
            <Night />
            <Sunrise />
            <InstallBar />
        </main>
    );
}
