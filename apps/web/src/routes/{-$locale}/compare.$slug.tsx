import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import type { AnswerItem } from "@/components/answer-hub";
import { Article, DELAYS, Figures, Questions, nextAfter } from "@/components/answers/article";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";
import { hasKey } from "@/lib/has-key";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { answerTrail, faqPage, ldJson, pageMeta, webPage } from "@/lib/seo";
import { longDate, rivalChecked } from "@/lib/site";

type Labels = ReturnType<typeof getIntlayer<"answers">>["labels"];

const POINTS = [
    { icon: "text-aa", id: "sentence", span: "md:col-span-3" },
    { icon: "currency-circle-dollar", id: "currencies", span: "md:col-span-2" },
    { icon: "device-mobile", id: "ledger", span: "md:col-span-2" },
    { icon: "check-circle", id: "free", span: "md:col-span-3" },
] as const satisfies readonly { icon: IconName; id: keyof Labels["outlayrPoints"]; span: string }[];

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
                        dateModified: rivalChecked(loaderData).toISOString().slice(0, 10),
                    })
                ),
            ],
        };
    },
});

function Compare() {
    const slug = Route.useLoaderData();
    const { compare, guides, labels } = useIntlayer("answers");
    const { locale } = useLocale();
    const page = compare[slug];
    const checked = rivalChecked(slug);
    const sides = [
        { items: page.fit.outlayr, name: "Outlayr", tone: "text-tint" },
        { items: page.fit.rival, name: page.rival.value, tone: "text-muted" },
    ];
    const listedIn: AnswerItem[] = [];
    for (const [guideSlug, guide] of Object.entries(guides)) {
        for (const app of "apps" in guide ? guide.apps : []) {
            if (app.slug.value === slug) {
                listedIn.push({ name: guide.title, slug: guideSlug, text: guide.lead, to: "/{-$locale}/guides/$slug" });
            }
        }
    }
    const related: AnswerItem[] = [
        ...listedIn,
        ...nextAfter(compare, slug, 3 - listedIn.length).map((other) => ({
            name: compare[other].title,
            slug: other,
            text: compare[other].summary,
            to: "/{-$locale}/compare/$slug" as const,
        })),
    ];
    return (
        <Article
            checked={checked}
            hub="/compare"
            lead={page.lead}
            related={related}
            sections={[
                {
                    body: (
                        <>
                            <div
                                className="-mx-6 mt-8 overflow-x-auto overscroll-x-contain px-6 delay-100 md:mx-0 md:px-0"
                                data-reveal
                            >
                                <table className="w-full min-w-xl border-collapse text-left tabular-nums">
                                    <thead>
                                        <tr className="border-foreground border-b">
                                            <th className="w-1/5 py-3 pr-6" scope="col">
                                                <span className="sr-only">{labels.feature}</span>
                                            </th>
                                            <th className="py-3 pr-6 font-semibold" scope="col">
                                                Outlayr
                                            </th>
                                            <th className="text-muted py-3 font-semibold" scope="col">
                                                {page.rival}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {page.rows.map((row) => (
                                            <tr className="border-border border-b align-top" key={row.label.value}>
                                                <th
                                                    className="text-muted py-4 pr-6 font-mono text-xs font-normal tracking-widest uppercase"
                                                    scope="row"
                                                >
                                                    {row.label}
                                                </th>
                                                <td className="py-4 pr-6">
                                                    <Figures text={row.outlayr.value} />
                                                </td>
                                                <td className="text-muted py-4">
                                                    <Figures text={row.rival.value} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                        <ul className="mt-8 grid gap-4 md:grid-cols-5">
                            {POINTS.map((point, index) => (
                                <li
                                    className={`bg-surface flex gap-4 rounded-3xl p-6 md:block md:p-8 ${point.span} ${index % 2 === 1 ? "delay-100" : ""}`}
                                    data-reveal
                                    key={point.id}
                                >
                                    <span className="bg-raised text-tint flex size-10 shrink-0 items-center justify-center rounded-full">
                                        <Icon className="text-xl" name={point.icon} />
                                    </span>
                                    <div className="md:mt-8">
                                        <h3 className="text-xl font-semibold tracking-tight">
                                            {labels.outlayrPoints[point.id].title}
                                        </h3>
                                        <p className="text-muted mt-2">{labels.outlayrPoints[point.id].text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ),
                    id: "outlayr",
                    title: labels.outlayrDoes,
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
                    body: <Questions items={page.faq} />,
                    id: "questions",
                    title: labels.questions,
                },
            ]}
            title={page.title}
        />
    );
}
