import { createFileRoute } from "@tanstack/react-router";

import { InstallmentDetail } from "@/components/dashboard/installments/installment-detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/installments/$planId")({
    head: pageHead("installment"),
    component: Detail,
});

function Detail() {
    const { planId } = Route.useParams();
    return <InstallmentDetail planId={planId} />;
}
