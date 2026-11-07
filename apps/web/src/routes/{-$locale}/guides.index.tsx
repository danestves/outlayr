import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { AnswerHub } from "@/components/answer-hub";
import { isPublished, localeFromParam, pageUrl } from "@/lib/i18n";
import { hubTrail, itemList, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/guides/")({
    component: Guides,
    loader: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { guides, hubs } = getIntlayer("answers", locale);
        const items = Object.entries(guides)
            .filter(([slug]) => isPublished(`/guides/${slug}`, locale))
            .map(([slug, guide]) => ({ name: guide.title, url: pageUrl(`/guides/${slug}`, locale) }));
        return {
            head: {
                meta: pageMeta(hubs.guides.meta.title, hubs.guides.lead),
                scripts: [ldJson(itemList(items)), ldJson(hubTrail(locale, "guides"))],
            },
        };
    },
    head: ({ loaderData }) => loaderData?.head ?? {},
});

function Guides() {
    const { guides, hubs } = useIntlayer("answers");
    const { locale } = useLocale();
    return (
        <AnswerHub
            items={Object.entries(guides)
                .filter(([slug]) => isPublished(`/guides/${slug}`, locale))
                .map(([slug, guide], index) => ({
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
