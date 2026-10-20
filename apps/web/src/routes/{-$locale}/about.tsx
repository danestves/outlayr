import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { Page } from "@/components/page";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { ORGANIZATION_ID, ldJson, pageMeta, webPage } from "@/lib/seo";
import { APP_STORE_URL, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

const SECTION = "py-24";
const HEADING = "text-4xl font-semibold tracking-tight md:text-5xl";
const LABEL = "font-mono text-xs tracking-widest uppercase";
const FACT_SPANS = [
    "lg:col-span-4",
    "lg:col-span-5",
    "lg:col-span-4",
    "lg:col-span-3",
    "lg:col-span-7",
    "lg:col-span-5",
    "lg:col-span-5",
    "lg:col-span-7",
    "lg:col-span-8",
    "lg:col-span-4",
    "md:col-span-2 lg:col-span-12",
] as const;
const SHOTS = [
    { id: "budgets", path: "/screens/04" },
    { id: "insights", path: "/screens/05" },
    { id: "accounts", path: "/screens/06" },
    { id: "subscriptions", path: "/screens/10" },
] as const;
const THEMES = [
    { className: "light-only", suffix: "" },
    { className: "dark-only", suffix: "-dark" },
] as const;

export const Route = createFileRoute("/{-$locale}/about")({
    component: About,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { entity, meta } = getIntlayer("about", locale);
        return {
            meta: pageMeta(meta.title, meta.description),
            scripts: [
                ldJson(
                    webPage(locale, "/about", {
                        "@type": "AboutPage",
                        about: { "@id": ORGANIZATION_ID },
                        mainEntity: {
                            "@id": `${SITE_URL}/#app`,
                            "@type": "MobileApplication",
                            applicationCategory: "FinanceApplication",
                            description: entity,
                            downloadUrl: APP_STORE_URL,
                            inLanguage: Object.values(LANGUAGES).map((language) => language.lang),
                            name: "Outlayr",
                            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                            operatingSystem: "iOS 18.0",
                            publisher: { "@id": ORGANIZATION_ID },
                        },
                        name: meta.title,
                    })
                ),
            ],
        };
    },
});

function About() {
    const { entity, title } = useIntlayer("about");
    return (
        <Page lead={entity} title={title}>
            <Story />
            <Facts />
            <Press />
            <Contact />
        </Page>
    );
}

function Story() {
    const { story, thesis } = useIntlayer("about");
    return (
        <>
            <section className={SECTION}>
                <p className="max-w-[680px] text-4xl font-semibold tracking-tight md:text-5xl">
                    {thesis.value.split(" ").map((word, index) => (
                        <span data-word key={`${index}${word}`}>
                            {`${word} `}
                        </span>
                    ))}
                </p>
            </section>
            <section className={`${SECTION} grid gap-8 lg:grid-cols-12 lg:gap-16`}>
                <h2 className={`${HEADING} lg:col-span-5`} data-reveal>
                    {story.title}
                </h2>
                <div className="text-muted flex max-w-[65ch] flex-col gap-6 text-lg lg:col-span-7">
                    {story.body.map((paragraph, index) => (
                        <p className={index > 0 ? "delay-100" : undefined} data-reveal key={paragraph.value}>
                            {paragraph}
                        </p>
                    ))}
                </div>
            </section>
        </>
    );
}

function Facts() {
    const { data, facts, factsTitle } = useIntlayer("about");
    return (
        <section className={SECTION}>
            <h2 className={`${HEADING} max-w-[680px]`} data-reveal>
                {factsTitle}
            </h2>
            <dl className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
                <div
                    className="bg-foreground text-background flex flex-col gap-8 rounded-3xl p-6 md:col-span-2 md:p-8 lg:col-span-8"
                    data-reveal
                    data-spot
                >
                    <dt className={`${LABEL} opacity-60`}>{data.label}</dt>
                    <dd className="text-xl font-medium tracking-tight md:text-2xl">{data.text}</dd>
                </div>
                {facts.map((fact, index) => (
                    <div
                        className={`bg-surface flex flex-col gap-8 rounded-3xl p-6 md:p-8 ${FACT_SPANS[index] ?? "lg:col-span-6"} ${index % 2 === 0 ? "delay-100" : ""}`}
                        data-reveal
                        data-spot
                        key={fact.label.value}
                    >
                        <dt className={`${LABEL} text-muted`}>{fact.label}</dt>
                        <dd className="text-base md:text-lg">{fact.text}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function Press() {
    const { appIcon, press, shots } = useIntlayer("about");
    return (
        <section className={SECTION}>
            <h2 className={HEADING} data-reveal>
                {press}
            </h2>
            <ul className="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <li className="col-span-2 lg:col-span-1" data-reveal>
                    <a
                        className="fluid bg-surface hover:bg-foreground/5 flex h-full items-center gap-4 rounded-3xl p-4 active:scale-[0.98] md:p-6 lg:flex-col lg:items-start lg:justify-between"
                        href="/apple-touch-icon.png"
                    >
                        <img
                            alt=""
                            className="size-16 rounded-2xl lg:size-24 lg:rounded-3xl"
                            height={180}
                            loading="lazy"
                            src="/apple-touch-icon.png"
                            width={180}
                        />
                        <PressLabel detail="180 × 180" label={appIcon} />
                    </a>
                </li>
                {SHOTS.map((shot, index) => (
                    <li className={index % 2 === 0 ? "delay-100" : "delay-150"} data-reveal key={shot.id}>
                        {THEMES.map((theme) => (
                            <div className={theme.className} key={theme.suffix}>
                                <a
                                    className="fluid bg-surface hover:bg-foreground/5 flex flex-col gap-4 rounded-3xl p-4 active:scale-[0.98] md:p-6"
                                    href={`${shot.path}${theme.suffix}.webp`}
                                >
                                    <img
                                        alt=""
                                        className="w-full rounded-[15.5%/7.1%]"
                                        height={1912}
                                        loading="lazy"
                                        src={`${shot.path}${theme.suffix}.webp`}
                                        width={880}
                                    />
                                    <PressLabel detail="880 × 1912" label={shots[shot.id]} />
                                </a>
                            </div>
                        ))}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function PressLabel({ detail, label }: { detail: string; label: ReactNode }) {
    return (
        <span className="flex min-w-0 flex-1 items-start justify-between gap-2 lg:w-full lg:flex-none">
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="text-muted tabular mt-1 block font-mono text-xs">{detail}</span>
            </span>
            <Icon className="text-muted mt-0.5 shrink-0" name="arrow-up-right" />
        </span>
    );
}

function Contact() {
    const { allComparisons, allGuides, contact } = useIntlayer("about");
    const { footer } = useIntlayer("site");
    const links = [
        { label: allGuides, to: "/guides" },
        { label: allComparisons, to: "/compare" },
        { label: footer.support, to: "/support" },
    ] as const;
    return (
        <section className="pt-24">
            <div className="bg-surface rounded-3xl px-6 py-16 md:px-16 md:py-24" data-reveal>
                <h2 className="hero-text max-w-[680px] pb-2 text-5xl font-semibold tracking-tighter md:text-7xl">
                    {contact.title}
                </h2>
                <p className="text-muted mt-6 max-w-[680px] text-lg md:text-xl">{contact.lead}</p>
                <a
                    className="fluid mt-10 inline-flex items-center gap-3 text-xl font-semibold tracking-tight underline decoration-current/20 underline-offset-8 hover:decoration-current sm:text-2xl md:text-4xl"
                    href={`mailto:${SUPPORT_EMAIL}`}
                >
                    {SUPPORT_EMAIL}
                    <Icon className="text-tint shrink-0" name="arrow-up-right" />
                </a>
                <ul className="mt-12 flex flex-wrap gap-2">
                    {links.map((link) => (
                        <li key={link.to}>
                            <LocalizedLink
                                className="fluid bg-raised hover:bg-foreground/5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
                                to={link.to}
                            >
                                {link.label}
                                <Icon className="text-muted" name="arrow-right" />
                            </LocalizedLink>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
