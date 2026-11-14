import { createFileRoute } from "@tanstack/react-router";

import { ReorderAccounts } from "@/components/dashboard/accounts/reorder";

export const Route = createFileRoute("/_account/app/accounts/reorder")({ component: ReorderAccounts });
