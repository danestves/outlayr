import { createFileRoute } from "@tanstack/react-router";

import { Categories } from "@/components/dashboard/settings/categories/screen";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/categories/")({
    head: pageHead("settingsCategories"),
    component: Categories,
});
