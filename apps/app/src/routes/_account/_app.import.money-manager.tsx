import { createFileRoute } from "@tanstack/react-router";

import { MoneyManagerImport } from "@/components/dashboard/import/money-manager/money-manager-import";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/import/money-manager")({
    head: pageHead("import"),
    component: MoneyManagerImport,
});
