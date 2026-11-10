import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toast } from "panelui-web/toast";

import { ruleToasts } from "@/components/dashboard/rules/data";
import { LiveRules } from "@/components/dashboard/rules/rules-screen";
import { patched, rulesSearch } from "@/components/dashboard/rules/search";
import type { RulesPatch } from "@/components/dashboard/rules/search";

export const Route = createFileRoute("/_account/app/rules")({
    component: Rules,
    validateSearch: rulesSearch,
});

function Rules() {
    const search = Route.useSearch();
    const navigate = useNavigate();
    const setSearch = (patch: RulesPatch, options?: { replace?: boolean }) =>
        navigate({ replace: options?.replace, resetScroll: false, search: (prev) => patched(prev, patch), to: "." });
    return (
        <Toast.Provider position="bottom-right" toastManager={ruleToasts}>
            <LiveRules search={search} setSearch={setSearch} />
        </Toast.Provider>
    );
}
