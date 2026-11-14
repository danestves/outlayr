import { createFileRoute } from "@tanstack/react-router";

import { InstallmentsScreen } from "@/components/dashboard/installments/installments-screen";

export const Route = createFileRoute("/_account/_app/installments/")({ component: InstallmentsScreen });
