import { createFileRoute } from "@tanstack/react-router";

import { CategoryDetail } from "@/components/dashboard/settings/categories/detail";

export const Route = createFileRoute("/_account/app/settings/categories/$categoryId")({ component: Detail });

function Detail() {
    const { categoryId } = Route.useParams();
    return <CategoryDetail categoryId={categoryId} />;
}
