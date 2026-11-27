import { createFileRoute } from "@tanstack/react-router";

import { Currency } from "@/components/dashboard/settings/currency";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/currency")({
    head: pageHead("settingsCurrency"),
    component: Currency,
});
