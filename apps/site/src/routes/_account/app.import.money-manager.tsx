import { createFileRoute } from "@tanstack/react-router";

import { MoneyManagerImport } from "@/components/dashboard/import/money-manager/money-manager-import";

export const Route = createFileRoute("/_account/app/import/money-manager")({ component: MoneyManagerImport });
