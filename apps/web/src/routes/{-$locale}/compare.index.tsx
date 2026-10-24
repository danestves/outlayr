import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { AnswerHub } from "@/components/answer-hub";
import { localeFromParam, pageUrl } from "@/lib/i18n";
import { hubTrail, itemList, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/compare/")({
    component: Comparisons,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { compare, hubs } = getIntlayer("answers", locale);
        const items = Object.entries(compare).map(([slug, page]) => ({
            name: page.rival,
            url: pageUrl(`/compare/${slug}`, locale),
        }));
        return {
            meta: pageMeta(hubs.compare.meta.title, hubs.compare.meta.description),
            scripts: [ldJson(itemList(items)), ldJson(hubTrail(locale, "compare"))],
        };
    },
});

function Comparisons() {
    const { compare, hubs } = useIntlayer("answers");
    return (
        <AnswerHub
            items={Object.entries(compare).map(([slug, page]) => ({
                kicker: page.site,
                name: page.rival,
                slug,
                text: page.summary,
                to: "/{-$locale}/compare/$slug",
            }))}
            lead={hubs.compare.lead}
            title={hubs.compare.title}
        />
    );
}
