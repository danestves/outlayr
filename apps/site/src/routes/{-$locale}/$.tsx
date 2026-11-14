import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/$")({
    beforeLoad: () => {
        throw notFound({ routeId: rootRouteId });
    },
});
