import { createFileRoute } from "@tanstack/react-router";

import { CategoryDetail } from "@/components/dashboard/settings/categories/detail";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/categories/$categoryId")({
    head: pageHead("settingsCategory"),
    component: Detail,
});

function Detail() {
    const { categoryId } = Route.useParams();
    return <CategoryDetail categoryId={categoryId} />;
}
