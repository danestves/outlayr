import { createFileRoute } from "@tanstack/react-router";

import { Categories } from "@/components/dashboard/settings/categories/screen";

export const Route = createFileRoute("/_account/app/settings/categories/")({ component: Categories });
