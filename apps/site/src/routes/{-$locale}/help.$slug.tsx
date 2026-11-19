import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { Article, DELAYS, Prose, Questions } from "@/components/answers/article";
import type { ArticleSection } from "@/components/answers/article";
import { hasKey } from "@/lib/has-key";
import { answerTrail, article, faqPage, ldJson, pageMeta } from "@/lib/seo";
import { HELP_PUBLISHED, HELP_UPDATED } from "@/lib/site";

export const Route = createFileRoute("/{-$locale}/help/$slug")({
    component: HelpArticle,
    loader: ({ params }) => {
        const { slug } = params;
        if (!hasKey(getIntlayer("help").articles, slug)) {
            throw notFound({ routeId: rootRouteId });
        }
        const locale = localeFromParam(params.locale);
        const page = getIntlayer("help", locale).articles[slug];
        const path = `/help/${slug}`;
        const questions = [{ answer: page.lead, question: page.title }, ...("faq" in page ? page.faq : [])];
        return {
            head: {
                meta: pageMeta(page.meta.title, page.meta.description),
                scripts: [
                    ldJson(
                        article(locale, path, {
                            dateModified: HELP_UPDATED,
                            datePublished: HELP_PUBLISHED,
                            description: page.meta.description,
                            headline: page.title,
                        })
                    ),
                    ldJson(faqPage(questions, LANGUAGES[locale].lang)),
                    ldJson(answerTrail(locale, "help", slug, page.title)),
                ],
            },
            slug,
        };
    },
    head: ({ loaderData }) => loaderData?.head ?? {},
});

function HelpArticle() {
    const { slug } = Route.useLoaderData();
    const { articles } = useIntlayer("help");
    const { labels } = useIntlayer("answers");
    const page = articles[slug];
    const sections: ArticleSection[] = page.steps.map((group) => ({
        body: (
            <ol className="mt-8 flex flex-col gap-4">
                {group.items.map((step, index) => (
                    <li
                        className={`bg-surface flex gap-6 rounded-3xl p-6 md:gap-8 md:p-8 ${DELAYS[index] ?? ""}`}
                        data-reveal
                        key={step.value}
                    >
                        <span aria-hidden="true" className="text-tint w-6 shrink-0 pt-0.5 font-mono text-sm">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="max-w-xl">{step}</p>
                    </li>
                ))}
            </ol>
        ),
        id: group.id.value,
        title: group.title,
    }));
    for (const section of "more" in page ? page.more : []) {
        sections.push({ body: <Prose paragraphs={section.body} />, id: section.id.value, title: section.title });
    }
    if ("faq" in page) {
        sections.push({ body: <Questions items={page.faq} />, id: "questions", title: labels.questions });
    }
    return (
        <Article
            dated={{ day: HELP_UPDATED, label: "updatedOn" }}
            hub="/help"
            lead={page.lead}
            related={page.related}
            sections={sections}
            title={page.title}
        />
    );
}
