import { createFileRoute } from "@tanstack/react-router";

import { ReportsScreen } from "@/components/dashboard/insights/reports/screen";
import { reportsSearch } from "@/components/dashboard/insights/reports/search";
import { sharedLinksQuery } from "@/lib/account-state";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/insights/reports")({
    head: pageHead("reports"),
    component: ReportsScreen,
    validateSearch: reportsSearch,
    // Until the links arrive a shared report reads as unshared, so its share controls would act on a wrong answer.
    loader: async ({ context }) => {
        const links = context.queryClient.prefetchQuery(sharedLinksQuery);
        if (import.meta.env.SSR) {
            await links;
        }
    },
});
