import { normalizeReferralCode } from "@outlayr/money/contract";
import { capture } from "@outlayr/shared/analytics";
import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { Page } from "@/components/page";
import { StoreBadges } from "@/components/store-badges";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/join/$code")({
    component: ProfileJoin,
    loader: ({ params }) => {
        const code = normalizeReferralCode(params.code);
        if (code === null) {
            throw notFound({ routeId: rootRouteId });
        }
        return code;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const { meta } = getIntlayer("profileJoin", localeFromParam(params.locale));
        return { meta: [...pageMeta(meta.title, meta.description), { content: "noindex", name: "robots" }] };
    },
});

function ProfileJoin() {
    const code = Route.useLoaderData();
    const { how, lead, open, title } = useIntlayer("profileJoin");
    return (
        <Page lead={lead} title={title}>
            <div className="mt-10 flex flex-col items-start gap-6 delay-300" data-reveal>
                <StoreBadges placement="invite" />
                <a
                    className="fluid bg-surface hover:bg-foreground/5 inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold active:scale-[0.98]"
                    href={`outlayr://join/${code.toLowerCase()}`}
                    onClick={() => capture("profile_invite_open_clicked")}
                >
                    <Icon name="device-mobile" />
                    {open}
                </a>
            </div>
            <div className="text-muted mt-16 max-w-[680px] space-y-2 delay-300" data-reveal>
                <p>{how}</p>
            </div>
        </Page>
    );
}
