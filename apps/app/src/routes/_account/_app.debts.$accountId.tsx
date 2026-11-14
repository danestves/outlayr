import { createFileRoute } from "@tanstack/react-router";

import { DebtDetail } from "@/components/dashboard/debts/debt-detail";

export const Route = createFileRoute("/_account/_app/debts/$accountId")({ component: Detail });

function Detail() {
    const { accountId } = Route.useParams();
    return <DebtDetail accountId={accountId} />;
}
