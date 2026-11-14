import { createFileRoute } from "@tanstack/react-router";

import { InstallmentDetail } from "@/components/dashboard/installments/installment-detail";

export const Route = createFileRoute("/_account/_app/installments/$planId")({ component: Detail });

function Detail() {
    const { planId } = Route.useParams();
    return <InstallmentDetail planId={planId} />;
}
