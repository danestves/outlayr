import { createFileRoute, notFound } from "@tanstack/react-router";

import { LostPage } from "@/components/error-page";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/$")({
    head: pageHead("notFound"),
    loader: () => {
        throw notFound();
    },
    notFoundComponent: LostPage,
});
