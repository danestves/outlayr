import { createFileRoute, notFound } from "@tanstack/react-router";

import { LostPage } from "@/components/error-page";

export const Route = createFileRoute("/_account/_app/$")({
    loader: () => {
        throw notFound();
    },
    notFoundComponent: LostPage,
});
