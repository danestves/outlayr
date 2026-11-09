import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { Page } from "@/components/page";
import { localeFromParam } from "@/lib/i18n";
import { APP_ID, ORGANIZATION_ID, ldJson, pageMeta, webPage } from "@/lib/seo";
import { FOUNDER, SUPPORT_EMAIL } from "@/lib/site";

const SECTION = "py-24";
const HEADING = "text-4xl font-semibold tracking-tight md:text-5xl";
const LABEL = "font-mono text-xs";
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
] as const;
export const Route = createFileRoute("/{-$locale}/about")({
    component: About,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { meta } = getIntlayer("about", locale);
        return {
            meta: pageMeta(meta.title, meta.description),
            scripts: [
                ldJson(
                    webPage(locale, "/about", {
                        "@type": "AboutPage",
                        about: { "@id": ORGANIZATION_ID },
                        mainEntity: { "@id": APP_ID },
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
                    className="bg-foreground text-background relative flex flex-col gap-8 rounded-3xl p-6 md:col-span-2 md:p-8 lg:col-span-8"
                    data-reveal
                >
                    <dt className={`${LABEL} opacity-60`}>{data.label}</dt>
                    <dd className="text-xl font-medium tracking-tight md:text-2xl">{data.text}</dd>
                </div>
                {facts.map((fact, index) => (
                    <div
                        className={`bg-surface relative flex flex-col gap-8 rounded-3xl p-6 md:p-8 ${FACT_SPANS[index] ?? "lg:col-span-6"} ${index % 2 === 0 ? "delay-100" : ""}`}
                        data-reveal
                        key={fact.label.value}
                    >
                        <dt className={`${LABEL} text-muted`}>{fact.label}</dt>
                        <dd className="text-base md:text-lg">{fact.text}</dd>
                    </div>
                ))}
                <Maker />
            </dl>
        </section>
    );
}

const MAKER_LINK = "fluid decoration-border hover:decoration-foreground underline underline-offset-4";

function Maker() {
    const { maker } = useIntlayer("about");
    return (
        <div
            className="bg-surface relative flex scroll-mt-24 flex-col gap-8 rounded-3xl p-6 md:col-span-2 md:p-8 lg:col-span-12"
            data-reveal
            id="maker"
        >
            <dt className={`${LABEL} text-muted`}>{maker.label}</dt>
            <dd className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <img
                        alt=""
                        className="size-14 rounded-full"
                        height={56}
                        loading="lazy"
                        src={FOUNDER.image}
                        width={56}
                    />
                    <div>
                        <p className="text-lg font-semibold">{maker.name}</p>
                        <p className="text-muted">{maker.role}</p>
                    </div>
                </div>
                <div className="flex max-w-[880px] flex-col gap-2">
                    <p className="text-base md:text-lg">{maker.bio}</p>
                    <p className="text-muted text-sm">{maker.company}</p>
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <li>
                        <a className={MAKER_LINK} href={FOUNDER.github} rel="me">
                            GitHub
                        </a>
                    </li>
                    <li>
                        <a className={MAKER_LINK} href={FOUNDER.x} rel="me">
                            X
                        </a>
                    </li>
                    <li>
                        <a className={MAKER_LINK} href={FOUNDER.website} rel="me">
                            {maker.website}
                        </a>
                    </li>
                </ul>
            </dd>
        </div>
    );
}

function Contact() {
    const { allComparisons, allGuides, contact } = useIntlayer("about");
    const { footer } = useIntlayer("site");
    const links = [
        { label: allGuides, to: "/guides" },
        { label: allComparisons, to: "/compare" },
        { label: footer.support, to: "/support" },
        { label: footer.brand, to: "/brand" },
    ] as const;
    return (
        <section className="pt-24">
            <div className="bg-surface rounded-3xl px-6 py-16 md:px-16 md:py-24" data-reveal>
                <h2 className="max-w-[680px] pb-2 text-5xl font-semibold tracking-tighter md:text-7xl">
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
