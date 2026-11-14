import { createFileRoute } from "@tanstack/react-router";

import { AccountsScreen } from "@/components/dashboard/accounts/accounts-screen";

export const Route = createFileRoute("/_account/app/accounts/")({ component: AccountsScreen });
