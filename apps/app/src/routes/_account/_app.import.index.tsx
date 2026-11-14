import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ImportHome } from "@/components/dashboard/import/home";
import { importSearch } from "@/components/dashboard/import/search";

export const Route = createFileRoute("/_account/_app/import/")({ component: Home, validateSearch: importSearch });

function Home() {
    const { kind, tab } = Route.useSearch();
    const navigate = useNavigate();
    return (
        <ImportHome
            onTab={(next) =>
                navigate({ resetScroll: false, search: { tab: next === "history" ? next : undefined }, to: "." })
            }
            notionReturn={kind === "notion"}
            tab={tab === "history" ? "history" : "new"}
        />
    );
}
