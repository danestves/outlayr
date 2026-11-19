import mono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import rounded from "@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?url";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { paintTheme, readTheme } from "@outlayr/shared/theme";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { Away } from "@/components/home/away";
import { Capture } from "@/components/home/capture";
import { Dawn } from "@/components/home/dawn";
import { InstallBar } from "@/components/home/install-bar";
import { Night } from "@/components/home/night";
import { loadReplicas } from "@/components/home/replica";
import { Sunrise } from "@/components/home/sunrise";
import { Sunset } from "@/components/home/sunset";
import { getDemoCast } from "@/lib/demo-cast";
import { watchGround } from "@/lib/ground";
import { scanMotion } from "@/lib/motion";
import { getHomeStats } from "@/lib/open-stats";
import { faqPage, ldJson, pageMeta } from "@/lib/seo";

const AGENT_LINKS = [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/json"',
    '</llms.txt>; rel="service-doc"; type="text/plain"',
    '</.well-known/ai-catalog.json>; rel="ai-catalog"',
].join(", ");

const HERO_GROUND = "#f1f0ea";

export const Route = createFileRoute("/{-$locale}/")({
    beforeLoad: () => loadReplicas(),
    component: HomePage,
    loader: async () => {
        const [cast, stats] = await Promise.all([getDemoCast(), getHomeStats()]);
        return { cast, stats };
    },
    headers: () => ({ Link: AGENT_LINKS }),
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { faq, meta } = getIntlayer("home", locale);
        return {
            links: [mono, rounded].map((href) => ({
                as: "font",
                crossOrigin: "anonymous",
                href,
                rel: "preload",
                type: "font/woff2",
            })),
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(faqPage(faq, LANGUAGES[locale].lang))],
        };
    },
});

function navLine(nav: HTMLElement) {
    const { height, top } = nav.getBoundingClientRect();
    return top + height / 2;
}

function topEdge(strips: HTMLDivElement | null) {
    return strips ? watchGround(strips, () => 0) : undefined;
}

function bottomEdge(strips: HTMLDivElement | null) {
    return strips ? watchGround(strips, () => innerHeight - 1) : undefined;
}

function home(main: HTMLElement | null) {
    if (!main) {
        return;
    }
    const tint = requestAnimationFrame(() => {
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", HERO_GROUND);
    });
    const motion = scanMotion();
    const nav = document.querySelector<HTMLElement>("[data-site-nav]");
    const ground = nav ? watchGround(nav, () => navLine(nav)) : undefined;
    return () => {
        cancelAnimationFrame(tint);
        motion();
        ground?.();
        paintTheme(readTheme());
    };
}

function HomePage() {
    return (
        <>
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
                <div aria-hidden="true" className="hz-edge" data-edge="bottom" ref={bottomEdge}>
                    <div />
                    <div />
                    <div />
                </div>
            </main>
            <div aria-hidden="true" className="hz-edge" data-edge="top" ref={topEdge}>
                <div />
                <div />
            </div>
        </>
    );
}
