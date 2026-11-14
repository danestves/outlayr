import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { SharedReportOff, SharedReportPage } from "@/components/dashboard/insights/reports/shared";
import { pageMeta } from "@/lib/seo";
import { getSharedReport } from "@/lib/shared-report";

const NO_INDEX = { content: "noindex", name: "robots" };

export const Route = createFileRoute("/{-$locale}/r/$slug")({
    component: Shared,
    loader: async ({ params }) => {
        const shared = await getSharedReport({ data: params.slug });
        if (shared === null) {
            throw notFound();
        }
        return shared;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return { meta: [NO_INDEX] };
        }
        const { meta } = getIntlayer("shared-report", localeFromParam(params.locale));
        return {
            meta: [...pageMeta(meta.title({ name: loaderData.report.name }), meta.description), NO_INDEX],
        };
    },
    notFoundComponent: SharedReportOff,
});

function Shared() {
    const { report, updatedAt } = Route.useLoaderData();
    return <SharedReportPage shared={report} updatedAt={updatedAt} />;
}
