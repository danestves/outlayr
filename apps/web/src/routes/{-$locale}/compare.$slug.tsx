import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { Article, CompareTable, DELAYS, FactList, Questions } from "@/components/answers/article";
import { Icon } from "@/components/icon";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { answerTrail, faqPage, ldJson, pageMeta, webPage } from "@/lib/seo";
import { EXPORTS_CHECKED, compareUpdated, longDate, rivalChecked } from "@/lib/site";

export const Route = createFileRoute("/{-$locale}/compare/$slug")({
    component: Compare,
    loader: ({ params }) => {
        if (!hasKey(getIntlayer("answers").compare, params.slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        return params.slug;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const locale = localeFromParam(params.locale);
        const rival = getIntlayer("answers", locale).compare[loaderData];
        return {
            meta: pageMeta(rival.meta.title, rival.meta.description),
            scripts: [
                ldJson(faqPage(rival.faq, LANGUAGES[locale].lang)),
                ldJson(answerTrail(locale, "compare", loaderData, rival.title)),
                ldJson(
                    webPage(locale, `/compare/${loaderData}`, {
                        dateModified: compareUpdated(loaderData).toISOString().slice(0, 10),
                    })
                ),
            ],
        };
    },
});

function Compare() {
    const slug = Route.useLoaderData();
    const { compare, labels } = useIntlayer("answers");
    const { locale } = useLocale();
    const page = compare[slug];
    const checked = rivalChecked(slug);
    const sides = [
        { items: page.fit.outlayr, name: "Outlayr", tone: "text-tint" },
        { items: page.fit.rival, name: page.rival.value, tone: "text-muted" },
    ];
    return (
        <Article
            dated={{ day: checked, label: "checkedOn" }}
            hub="/compare"
            lead={page.lead}
            related={page.related}
            sections={[
                {
                    body: (
                        <>
                            <CompareTable
                                columns={[
                                    { id: "outlayr", name: "Outlayr" },
                                    { id: "rival", muted: true, name: page.rival },
                                ]}
                                corner={labels.feature.value}
                                rows={page.rows.map((row) => ({
                                    cells: [row.outlayr.value, row.rival.value],
                                    id: row.label.value,
                                    label: row.label,
                                }))}
                            />
                            <p className="text-muted mt-4 text-sm">
                                {labels.source({ name: page.rival.value })}{" "}
                                <a
                                    className="fluid text-foreground decoration-border hover:decoration-tint underline underline-offset-4"
                                    href={page.source.value}
                                >
                                    {page.site}
                                </a>
                                {labels.checked({ date: longDate(checked, LANGUAGES[locale].date) })}
                            </p>
                        </>
                    ),
                    id: "side-by-side",
                    title: labels.sideBySide({ name: page.rival.value }),
                },
                {
                    body: (
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {sides.map((side, index) => (
                                <div
                                    className={`bg-surface rounded-3xl p-6 md:p-8 ${DELAYS[index]}`}
                                    data-reveal
                                    key={side.name}
                                >
                                    <h3 className="text-xl font-semibold tracking-tight">
                                        {labels.fitHeading({ name: side.name })}
                                    </h3>
                                    <ul className="mt-6 flex flex-col gap-3">
                                        {side.items.map((item) => (
                                            <li className="flex gap-3" key={item.value}>
                                                <Icon className={`mt-1 shrink-0 ${side.tone}`} name="check" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ),
                    id: "fit",
                    title: labels.fit,
                },
                {
                    body: (
                        <>
                            <FactList facts={page.moving} />
                            <p className="text-muted mt-4 text-sm">
                                {labels.exportsChecked({ date: longDate(EXPORTS_CHECKED, LANGUAGES[locale].date) })}
                            </p>
                        </>
                    ),
                    id: "moving",
                    title: labels.movingFrom({ name: page.rival.value }),
                },
                {
                    body: <Questions items={page.faq} />,
                    id: "questions",
                    title: labels.questions,
                },
            ]}
            title={page.title}
        />
    );
}
