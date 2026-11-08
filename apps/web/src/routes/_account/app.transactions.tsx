import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toast } from "panelui-web/toast";

import { TransactionsScreen } from "@/components/dashboard/transactions/screen";
import { patched, transactionsSearch } from "@/components/dashboard/transactions/search";
import type { SearchPatch } from "@/components/dashboard/transactions/search";
import { deleteToasts } from "@/components/dashboard/transactions/use-delete";

export const Route = createFileRoute("/_account/app/transactions")({
    component: Transactions,
    validateSearch: transactionsSearch,
});

function Transactions() {
    const search = Route.useSearch();
    const navigate = useNavigate();
    const setSearch = (patch: SearchPatch, options?: { replace?: boolean }) =>
        navigate({ replace: options?.replace, resetScroll: false, search: (prev) => patched(prev, patch), to: "." });
    return (
        <Toast.Provider position="bottom-center" toastManager={deleteToasts}>
            <TransactionsScreen search={search} setSearch={setSearch} />
        </Toast.Provider>
    );
}
