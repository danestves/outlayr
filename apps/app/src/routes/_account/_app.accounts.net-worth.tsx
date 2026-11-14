import { createFileRoute } from "@tanstack/react-router";

import { NetWorthScreen } from "@/components/dashboard/accounts/net-worth";

export const Route = createFileRoute("/_account/_app/accounts/net-worth")({ component: NetWorthScreen });
