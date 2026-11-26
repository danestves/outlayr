import { createFileRoute } from "@tanstack/react-router";

import { DebtDetail } from "@/components/dashboard/debts/debt-detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/debts/$accountId")({
    head: pageHead("debt"),
    component: Detail,
});

function Detail() {
    const { accountId } = Route.useParams();
    return <DebtDetail accountId={accountId} />;
}
