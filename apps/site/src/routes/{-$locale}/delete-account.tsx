import { localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument } from "@/components/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { branded, ldJson, legalPage, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/{-$locale}/delete-account")({
    component: DeleteAccount,
    loader: ({ params }) =>
        getLegalDocument({ data: { locale: localeFromParam(params.locale), slug: "delete-account" } }),
    head: ({ loaderData, params }) => ({
        meta: loaderData ? pageMeta(branded(loaderData.title), loaderData.description) : [],
        scripts: loaderData
            ? [ldJson(legalPage(localeFromParam(params.locale), "delete-account", loaderData.title))]
            : [],
    }),
});

function DeleteAccount() {
    return <LegalDocument {...Route.useLoaderData()} />;
}
