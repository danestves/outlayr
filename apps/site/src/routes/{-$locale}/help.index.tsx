import { localeFromParam, pageUrl } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { AnswerHub } from "@/components/answer-hub";
import { hubTrail, itemList, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/help/")({
    component: Help,
    loader: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { articles, hub } = getIntlayer("help", locale);
        const items = Object.entries(articles).map(([slug, item]) => ({
            name: item.title,
            url: pageUrl(`/help/${slug}`, locale),
        }));
        return {
            head: {
                meta: pageMeta(hub.meta.title, hub.lead),
                scripts: [ldJson(itemList(items)), ldJson(hubTrail(locale, "help"))],
            },
        };
    },
    head: ({ loaderData }) => loaderData?.head ?? {},
});

function Help() {
    const { articles, hub } = useIntlayer("help");
    return (
        <AnswerHub
            items={Object.entries(articles).map(([slug, item], index) => ({
                kicker: String(index + 1).padStart(2, "0"),
                name: item.title,
                slug,
                text: item.lead,
                to: "/{-$locale}/help/$slug",
            }))}
            lead={hub.lead}
            title={hub.title}
        />
    );
}
