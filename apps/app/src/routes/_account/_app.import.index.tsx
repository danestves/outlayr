import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ImportHome } from "@/components/dashboard/import/home";
import { importSearch } from "@/components/dashboard/import/search";
import { viewTransition } from "@/lib/motion";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/import/")({
    head: pageHead("import"),
    component: Home,
    validateSearch: importSearch,
});

function Home() {
    const { kind, tab } = Route.useSearch();
    const navigate = useNavigate();
    return (
        <ImportHome
            onTab={(next) =>
                navigate({
                    resetScroll: false,
                    search: { tab: next === "history" ? next : undefined },
                    to: ".",
                    viewTransition: viewTransition("dissolve"),
                })
            }
            notionReturn={kind === "notion"}
            tab={tab === "history" ? "history" : "new"}
        />
    );
}
