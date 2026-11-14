import { createFileRoute } from "@tanstack/react-router";

import { Currency } from "@/components/dashboard/settings/currency";

export const Route = createFileRoute("/_account/_app/settings/currency")({ component: Currency });
