import { Link, createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer, getPrefix } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, CompareTable, DELAYS, FactList, Figures, Prose, Questions } from "@/components/answers/article";
import type { ArticleSection } from "@/components/answers/article";
import { SayPanel, ScanPanel } from "@/components/demo/capture-panels";
import { screenSources } from "@/components/home/media";
import { Icon } from "@/components/icon";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam, pageUrl } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { answerTrail, article, faqPage, itemList, ldJson, pageMeta, webPage } from "@/lib/seo";
import { guideUpdated, listChecked, longDate } from "@/lib/site";

type GuideSlug = keyof ReturnType<typeof getIntlayer<"answers">>["guides"];

const PLATES = {
    "ai-expense-tracker": "say",
    "apple-pay-expense-tracker": "log-an-expense",
    "best-budget-apps": null,
    "best-expense-tracker-apps": null,
    "best-open-source-expense-tracker-apps": null,
    "best-subscription-tracker-apps": null,
    "budget-planner": "04",
    "expense-tracker-template": null,
    "how-to-track-expenses": null,
    "mint-alternative": null,
    "multi-currency-expense-tracker": "06",
    "receipt-scanner": "scan",
    "subscription-tracker": "10",
    "voice-expense-tracker": "say",
    "ynab-alternatives": null,
} as const satisfies Record<GuideSlug, string | null>;

const PANELS = {
    say: { frame: 5, Panel: SayPanel },
    scan: { frame: 5, Panel: ScanPanel },
} as const;

function plateImage(slug: GuideSlug, locale: Locale) {
    const plate = PLATES[slug];
    return plate === null || hasKey(PANELS, plate) ? null : screenSources(plate, locale);
}

const LABEL = "text-muted font-mono text-xs";

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
        const path = `/guides/${loaderData}`;
        const url = pageUrl(path, locale);
        const updated = guideUpdated(loaderData);
        const plate = plateImage(loaderData, locale);
        return {
            links: plate
                ? [
                      {
                          as: "image",
                          fetchPriority: "high",
                          href: plate.src,
                          media: "(prefers-color-scheme: light)",
                          rel: "preload",
                          type: "image/webp",
                      },
                      {
                          as: "image",
                          fetchPriority: "high",
                          href: plate.dark,
                          media: "(prefers-color-scheme: dark)",
                          rel: "preload",
                          type: "image/webp",
                      },
                  ]
                : [],
            meta: pageMeta(guide.meta.title, guide.meta.description),
            scripts: [
                ldJson(
                    article(locale, path, {
                        dateModified: updated,
                        description: guide.meta.description,
                        headline: guide.title,
                    })
                ),
                ldJson(faqPage(guide.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "guides", loaderData, guide.title)),
                ...("apps" in guide
                    ? [
                          ldJson({
                              ...itemList(guide.apps.map((app) => ({ name: app.name, url: `${url}#${app.slug}` }))),
                              "@id": `${url}#list`,
                          }),
                          ldJson(
                              webPage(locale, path, {
                                  "@id": url,
                                  dateModified: updated.toISOString().slice(0, 10),
                                  mainEntity: { "@id": `${url}#list` },
                                  name: guide.meta.title,
                              })
                          ),
                      ]
                    : []),
            ],
        };
    },
});

function GuidePlate({ alt, locale, plate }: { alt: string; locale: Locale; plate: string }) {
    if (!hasKey(PANELS, plate)) {
        const { dark, src } = screenSources(plate, locale);
        return (
            <figure className="bg-surface mx-auto w-full max-w-sm rounded-3xl p-2 lg:max-w-xs">
                <div className="aspect-4/5 overflow-hidden rounded-2xl lg:aspect-auto">
                    <img
                        alt={alt}
                        className="light-only size-full object-cover object-top lg:h-auto"
                        decoding="async"
                        fetchPriority="low"
                        height={1912}
                        src={src}
                        width={880}
                    />
                    <img
                        alt={alt}
                        className="dark-only size-full object-cover object-top lg:h-auto"
                        decoding="async"
                        fetchPriority="low"
                        height={1912}
                        src={dark}
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

function textOf(facts: readonly { label: { value: string }; text: { value: string } }[], label: string): string {
    return facts.find((fact) => fact.label.value === label)?.text.value ?? "";
}

function Guide() {
    const slug = Route.useLoaderData();
    const { compare, guides, labels } = useIntlayer("answers");
    const { locale } = useLocale();
    const guide = guides[slug];
    const plate = PLATES[slug];
    const sections: ArticleSection[] = [];
    if ("picked" in guide) {
        sections.push({
            body: <Prose paragraphs={guide.picked} />,
            id: "how-we-picked",
            title: labels.picked,
        });
    }
    if ("apps" in guide) {
        for (const app of guide.apps) {
            sections.push({
                body: (
                    <>
                        <p className="text-muted mt-4 max-w-2xl text-lg delay-100" data-reveal>
                            {app.summary}
                        </p>
                        <FactList facts={app.facts} />
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
    for (const section of "more" in guide ? guide.more : []) {
        sections.push({
            body: <Prose paragraphs={section.body} />,
            id: section.id.value,
            title: section.title,
        });
    }
    sections.push({
        body: <Questions items={guide.faq} />,
        id: "questions",
        title: labels.questions,
    });
    const downloads: ReactNode =
        "downloads" in guide ? (
            <div className="flex flex-wrap gap-3">
                {guide.downloads.map((file, index) => (
                    <a
                        className={`fluid inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold hover:-translate-y-0.5 active:translate-y-px ${index === 0 ? "bg-foreground text-background" : "bg-surface hover:bg-foreground/5"}`}
                        download
                        href={file.href.value}
                        key={file.href.value}
                    >
                        <Icon className="text-base" name="download-simple" />
                        {file.label}
                    </a>
                ))}
            </div>
        ) : null;
    const table: ReactNode =
        "table" in guide ? (
            <>
                <CompareTable
                    columns={guide.table.columns.map((column) => ({ id: column.value, name: column }))}
                    corner={guide.table.corner.value}
                    rows={guide.table.rows.map((row) => ({
                        cells: row.cells.map((cell) => cell.value),
                        id: row.label.value,
                        label: row.label,
                    }))}
                />
                <p className="text-muted mt-4 text-sm">{guide.table.caption}</p>
            </>
        ) : null;
    return (
        <Article
            actions={downloads}
            aside={
                plate !== null && "plateAlt" in guide ? (
                    <GuidePlate alt={guide.plateAlt.value} locale={locale} plate={plate} />
                ) : null
            }
            dated={{ day: guideUpdated(slug), label: "updatedOn" }}
            hub="/guides"
            lead={guide.lead}
            related={guide.related}
            sections={sections}
            title={guide.title}
        >
            {"apps" in guide ? (
                <>
                    <CompareTable
                        columns={[
                            { id: "best-if", name: labels.summary.bestIf },
                            { id: "price", name: labels.summary.price },
                            { id: "platforms", name: labels.summary.platforms },
                        ]}
                        corner={labels.summary.app.value}
                        rows={guide.apps.map((app) => ({
                            cells: [
                                textOf(guide.facts, app.name.value),
                                textOf(app.facts, labels.summary.price.value),
                                textOf(app.facts, labels.summary.platforms.value),
                            ],
                            id: app.slug.value,
                            label: app.name,
                        }))}
                    />
                    <p className="text-muted mt-4 text-sm">
                        {guide.sources}
                        {labels.checked({ date: longDate(listChecked(slug), LANGUAGES[locale].date) })}
                    </p>
                </>
            ) : (
                <>
                    {table}
                    <dl
                        className={`bg-surface grid gap-x-8 gap-y-6 rounded-3xl p-6 sm:grid-cols-2 md:p-8 ${table ? "mt-16" : ""}`}
                        data-reveal
                    >
                        {guide.facts.map((fact) => (
                            <div key={fact.label.value}>
                                <dt className={LABEL}>{fact.label}</dt>
                                <dd className="mt-2">
                                    <Figures text={fact.text.value} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </>
            )}
        </Article>
    );
}
