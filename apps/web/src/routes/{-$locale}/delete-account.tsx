import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument } from "@/components/legal-document";
import { localeFromParam } from "@/lib/i18n";
import { getLegalDocument } from "@/lib/legal";
import { ldJson, legalPage, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/delete-account")({
    component: DeleteAccount,
    loader: ({ params }) =>
        getLegalDocument({ data: { locale: localeFromParam(params.locale), slug: "delete-account" } }),
    head: ({ loaderData, params }) => ({
        meta: loaderData ? pageMeta(`${loaderData.title} · Outlayr`, loaderData.description) : [],
        scripts: loaderData
            ? [ldJson(legalPage(localeFromParam(params.locale), "delete-account", loaderData.title))]
            : [],
    }),
});

function DeleteAccount() {
    return <LegalDocument {...Route.useLoaderData()} />;
}
