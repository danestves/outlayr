import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { SharedReportOff, SharedReportPage } from "@/components/report/page";
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
        const { meta } = getIntlayer("shared-report", localeFromParam(params.locale));
        return { ...shared, meta: [...pageMeta(meta.title({ name: shared.report.name }), meta.description), NO_INDEX] };
    },
    head: ({ loaderData }) => ({ meta: loaderData?.meta ?? [NO_INDEX] }),
    notFoundComponent: SharedReportOff,
});

function Shared() {
    const { report, updatedAt } = Route.useLoaderData();
    return <SharedReportPage shared={report} updatedAt={updatedAt} />;
}
