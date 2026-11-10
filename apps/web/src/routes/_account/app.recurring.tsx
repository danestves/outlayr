import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toast } from "panelui-web/toast";

import { recurringToasts } from "@/components/dashboard/recurring/data";
import { LiveRecurring } from "@/components/dashboard/recurring/recurring-screen";
import { patched, recurringSearch } from "@/components/dashboard/recurring/search";
import type { RecurringPatch } from "@/components/dashboard/recurring/search";

export const Route = createFileRoute("/_account/app/recurring")({
    component: Recurring,
    validateSearch: recurringSearch,
});

function Recurring() {
    const search = Route.useSearch();
    const navigate = useNavigate();
    const setSearch = (patch: RecurringPatch, options?: { replace?: boolean }) =>
        navigate({ replace: options?.replace, resetScroll: false, search: (prev) => patched(prev, patch), to: "." });
    return (
        <Toast.Provider position="top-center" toastManager={recurringToasts}>
            <LiveRecurring search={search} setSearch={setSearch} />
        </Toast.Provider>
    );
}
