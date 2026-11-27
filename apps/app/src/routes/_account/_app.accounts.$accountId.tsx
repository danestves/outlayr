import { createFileRoute } from "@tanstack/react-router";

import { AccountDetail } from "@/components/dashboard/accounts/account-detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/accounts/$accountId")({
    head: pageHead("account"),
    component: Detail,
});

function Detail() {
    const { accountId } = Route.useParams();
    return <AccountDetail accountId={accountId} />;
}
