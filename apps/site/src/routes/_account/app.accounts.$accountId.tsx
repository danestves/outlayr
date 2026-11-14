import { createFileRoute } from "@tanstack/react-router";

import { AccountDetail } from "@/components/dashboard/accounts/account-detail";

export const Route = createFileRoute("/_account/app/accounts/$accountId")({ component: Detail });

function Detail() {
    const { accountId } = Route.useParams();
    return <AccountDetail accountId={accountId} />;
}
