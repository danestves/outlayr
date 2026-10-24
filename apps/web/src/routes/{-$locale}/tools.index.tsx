import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { AnswerHub } from "@/components/answer-hub";
import { localeFromParam, pageUrl } from "@/lib/i18n";
import { itemList, ldJson, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/tools/")({
    component: Tools,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { hub, pages } = getIntlayer("tools", locale);
        const items = Object.entries(pages).map(([slug, page]) => ({
            name: page.title,
            url: pageUrl(`/tools/${slug}`, locale),
        }));
        return {
            meta: pageMeta(hub.meta.title, hub.meta.description),
            scripts: [ldJson(itemList(items))],
        };
    },
});

function Tools() {
    const { hub, pages } = useIntlayer("tools");
    return (
        <AnswerHub
            items={Object.entries(pages).map(([slug, page], index) => ({
                kicker: String(index + 1).padStart(2, "0"),
                name: page.title,
                slug,
                text: page.lead,
                to: "/{-$locale}/tools/$slug",
            }))}
            lead={hub.lead}
            title={hub.title}
        />
    );
}
