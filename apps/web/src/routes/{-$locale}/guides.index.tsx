import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { AnswerHub } from "@/components/answer-hub";
import { localeFromParam, pageUrl } from "@/lib/i18n";
import { hubTrail, itemList, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/guides/")({
    component: Guides,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { guides, hubs } = getIntlayer("answers", locale);
        const items = Object.entries(guides).map(([slug, guide]) => ({
            name: guide.title,
            url: pageUrl(`/guides/${slug}`, locale),
        }));
        return {
            meta: pageMeta(hubs.guides.meta.title, hubs.guides.lead),
            scripts: [ldJson(itemList(items)), ldJson(hubTrail(locale, "guides"))],
        };
    },
});

function Guides() {
    const { guides, hubs } = useIntlayer("answers");
    return (
        <AnswerHub
            items={Object.entries(guides).map(([slug, guide], index) => ({
                kicker: String(index + 1).padStart(2, "0"),
                name: guide.title,
                slug,
                text: guide.lead,
                to: "/{-$locale}/guides/$slug",
            }))}
            lead={hubs.guides.lead}
            title={hubs.guides.title}
        />
    );
}
