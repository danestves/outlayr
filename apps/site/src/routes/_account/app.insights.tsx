import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PhoneInsights } from "@/components/dashboard/insights/insights-screen";
import { usePhone } from "@/components/dashboard/insights/use-wide";

export const Route = createFileRoute("/_account/app/insights")({ component: Insights });

function Insights() {
    const phone = usePhone();
    if (phone) {
        return <PhoneInsights />;
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <Outlet />
        </main>
    );
}
