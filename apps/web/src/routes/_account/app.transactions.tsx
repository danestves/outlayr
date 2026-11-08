import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { TransactionsScreen } from "@/components/dashboard/transactions/screen";
import { patched, transactionsSearch } from "@/components/dashboard/transactions/search";
import type { SearchPatch } from "@/components/dashboard/transactions/search";

export const Route = createFileRoute("/_account/app/transactions")({
    component: Transactions,
    validateSearch: transactionsSearch,
});

function Transactions() {
    const search = Route.useSearch();
    const navigate = useNavigate();
    const setSearch = (patch: SearchPatch, options?: { replace?: boolean }) =>
        navigate({ replace: options?.replace, resetScroll: false, search: (prev) => patched(prev, patch), to: "." });
    return <TransactionsScreen search={search} setSearch={setSearch} />;
}
