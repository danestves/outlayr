import { createFileRoute } from "@tanstack/react-router";

import { Account } from "@/components/dashboard/settings/account";

export const Route = createFileRoute("/_account/app/settings/account")({ component: Account });
