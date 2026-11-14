import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument } from "@/components/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { branded, ldJson, legalPage, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/terms")({
    component: Terms,
    loader: ({ params }) => getLegalDocument({ data: { locale: localeFromParam(params.locale), slug: "terms" } }),
    head: ({ loaderData, params }) => ({
        meta: loaderData ? pageMeta(branded(loaderData.title), loaderData.description) : [],
        scripts: loaderData ? [ldJson(legalPage(localeFromParam(params.locale), "terms", loaderData.title))] : [],
    }),
});

function Terms() {
    return <LegalDocument {...Route.useLoaderData()} />;
}
