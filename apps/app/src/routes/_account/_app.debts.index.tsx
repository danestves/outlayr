import { createFileRoute } from "@tanstack/react-router";

import { DebtsScreen } from "@/components/dashboard/debts/debts-screen";

export const Route = createFileRoute("/_account/_app/debts/")({ component: DebtsScreen });
