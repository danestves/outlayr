import { Link, createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer, getPrefix } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, DELAYS, Figures, Questions, nextAfter } from "@/components/answers/article";
import type { ArticleSection } from "@/components/answers/article";
import { SayPanel, ScanPanel } from "@/components/demo/capture-panels";
import { Icon } from "@/components/icon";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import { answerTrail, faqPage, itemList, ldJson, pageMeta, webPage } from "@/lib/seo";
import { longDate } from "@/lib/site";

type GuideSlug = keyof ReturnType<typeof getIntlayer<"answers">>["guides"];

const PLATES = {
    "apple-pay-expense-tracker": "/screens/log-an-expense.webp",
    "best-expense-tracker-apps": null,
    "best-open-source-expense-tracker-apps": null,
    "best-subscription-tracker-apps": null,
    "budget-planner": "/screens/04.webp",
    "expense-tracker-template": null,
    "mint-alternative": "/screens/log-an-expense.webp",
    "multi-currency-expense-tracker": "/screens/06.webp",
    "receipt-scanner": "scan",
    "subscription-tracker": "/screens/10.webp",
    "voice-expense-tracker": "say",
} as const satisfies Record<GuideSlug, string | null>;

const PANELS = {
    say: { frame: 5, Panel: SayPanel },
    scan: { frame: 5, Panel: ScanPanel },
} as const;

const LISTS_CHECKED = new Date(Date.UTC(2026, 9, 9));

const LISTS_RECHECKED = {
    "best-open-source-expense-tracker-apps": new Date(Date.UTC(2026, 9, 20)),
};

function listChecked(slug: GuideSlug): Date {
    return hasKey(LISTS_RECHECKED, slug) ? LISTS_RECHECKED[slug] : LISTS_CHECKED;
}

const WWW = /^www\./u;
const WEBP = /\.webp$/u;

const LABEL = "text-muted font-mono text-xs tracking-widest uppercase";

export const Route = createFileRoute("/{-$locale}/guides/$slug")({
    component: Guide,
    loader: ({ params }) => {
        if (!hasKey(getIntlayer("answers").guides, params.slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        return params.slug;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const locale = localeFromParam(params.locale);
        const guide = getIntlayer("answers", locale).guides[loaderData];
        const url = pageUrl(`/guides/${loaderData}`, locale);
        return {
            meta: pageMeta(guide.meta.title, guide.lead),
            scripts: [
                ldJson(faqPage(guide.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "guides", loaderData, guide.title)),
                ...("apps" in guide
                    ? [
                          ldJson(itemList(guide.apps.map((app) => ({ name: app.name, url: `${url}#${app.slug}` })))),
                          ldJson(
                              webPage(locale, `/guides/${loaderData}`, {
                                  dateModified: listChecked(loaderData).toISOString().slice(0, 10),
                              })
                          ),
                      ]
                    : []),
            ],
        };
    },
});

function GuidePlate({ alt, plate }: { alt: string; plate: string }) {
    if (!hasKey(PANELS, plate)) {
        return (
            <figure className="bg-surface mx-auto w-full max-w-sm rounded-3xl p-2 lg:max-w-xs">
                <div className="aspect-4/5 overflow-hidden rounded-2xl lg:aspect-auto">
                    {/* Both lazy: a hidden lazy image is never fetched, so only the painted theme's plate loads. */}
                    <img
                        alt={alt}
                        className="light-only size-full object-cover object-top lg:h-auto"
                        decoding="async"
                        fetchPriority="high"
                        height={1912}
                        loading="lazy"
                        src={plate}
                        width={880}
                    />
                    <img
                        alt={alt}
                        className="dark-only size-full object-cover object-top lg:h-auto"
                        decoding="async"
                        fetchPriority="high"
                        height={1912}
                        loading="lazy"
                        src={plate.replace(WEBP, "-dark.webp")}
                        width={880}
                    />
                </div>
            </figure>
        );
    }
    const { frame, Panel } = PANELS[plate];
    return (
        <figure className="bg-surface mx-auto w-full max-w-sm rounded-3xl p-2">
            <figcaption className="sr-only">{alt}</figcaption>
            <div aria-hidden="true" className="bg-raised rounded-2xl px-6 pb-6">
                <Panel frame={frame} />
            </div>
        </figure>
    );
}

function Source({ href }: { href: string }) {
    return (
        <a
            className="fluid text-muted hover:text-foreground ml-2 inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap"
            href={href}
        >
            {new URL(href).hostname.replace(WWW, "")}
            <Icon name="arrow-up-right" />
        </a>
    );
}

function Guide() {
    const slug = Route.useLoaderData();
    const { compare, guides, labels } = useIntlayer("answers");
    const { locale } = useLocale();
    const guide = guides[slug];
    const plate = PLATES[slug];
    const sections: ArticleSection[] = [];
    if ("apps" in guide) {
        for (const app of guide.apps) {
            sections.push({
                body: (
                    <>
                        <p className="text-muted mt-4 max-w-2xl text-lg delay-100" data-reveal>
                            {app.summary}
                        </p>
                        <dl className="border-border mt-8 border-t delay-150" data-reveal>
                            {app.facts.map((fact) => (
                                <div
                                    className="border-border grid gap-2 border-b py-4 sm:grid-cols-4 sm:gap-6"
                                    key={fact.label.value}
                                >
                                    <dt className={`${LABEL} sm:pt-1`}>{fact.label}</dt>
                                    <dd className="sm:col-span-3">
                                        <Figures text={fact.text.value} />
                                        {"source" in fact ? <Source href={fact.source.value} /> : null}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {hasKey(compare, app.slug.value) ? (
                            <Link
                                className="fluid bg-surface hover:bg-foreground/5 group mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                                params={{ locale: getPrefix(locale).localePrefix, slug: app.slug.value }}
                                to="/{-$locale}/compare/$slug"
                            >
                                {compare[app.slug.value].title}
                                <Icon className="fluid text-muted group-hover:translate-x-0.5" name="arrow-right" />
                            </Link>
                        ) : null}
                    </>
                ),
                id: app.slug.value,
                title: app.name,
            });
        }
    }
    if ("steps" in guide) {
        sections.push({
            body: (
                <ol className="mt-8 flex flex-col gap-4">
                    {guide.steps.map((step, index) => (
                        <li
                            className={`bg-surface flex gap-6 rounded-3xl p-6 md:gap-8 md:p-8 ${DELAYS[index]}`}
                            data-reveal
                            key={step.title.value}
                        >
                            <span aria-hidden="true" className="text-tint w-6 shrink-0 pt-1 font-mono text-sm">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                                <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                                <p className="text-muted mt-2 max-w-xl">{step.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            ),
            id: "steps",
            title: labels.steps,
        });
    }
    sections.push({
        body: <Questions items={guide.faq} />,
        id: "questions",
        title: labels.questions,
    });
    const download: ReactNode =
        "download" in guide ? (
            <a
                className="fluid bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold hover:-translate-y-0.5 active:translate-y-px"
                download
                href={guide.download.href.value}
            >
                <Icon className="text-base" name="download-simple" />
                {guide.download.label}
            </a>
        ) : null;
    return (
        <Article
            actions={download}
            aside={
                plate !== null && "plateAlt" in guide ? <GuidePlate alt={guide.plateAlt.value} plate={plate} /> : null
            }
            checked={"apps" in guide ? listChecked(slug) : undefined}
            hub="/guides"
            lead={guide.lead}
            related={nextAfter(guides, slug, 3).map((other) => ({
                name: guides[other].title,
                slug: other,
                text: guides[other].lead,
                to: "/{-$locale}/guides/$slug",
            }))}
            sections={sections}
            title={guide.title}
        >
            <dl className="bg-surface grid gap-x-8 gap-y-6 rounded-3xl p-6 sm:grid-cols-2 md:p-8" data-reveal>
                {guide.facts.map((fact) => (
                    <div key={fact.label.value}>
                        <dt className={LABEL}>{fact.label}</dt>
                        <dd className="mt-2">
                            <Figures text={fact.text.value} />
                        </dd>
                    </div>
                ))}
            </dl>
            {"apps" in guide ? (
                <p className="text-muted mt-4 text-sm">
                    {guide.sources}
                    {labels.checked({ date: longDate(listChecked(slug), LANGUAGES[locale].date) })}
                </p>
            ) : null}
        </Article>
    );
}
