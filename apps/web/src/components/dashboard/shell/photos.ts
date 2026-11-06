import type { ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import type { Overview, PhotoUrls } from "@/components/ledger/overview";

const PHOTO_REMINT_MS = 50 * 60_000;

export const NO_PHOTOS: PhotoUrls = new Map();

export function photoKeys({ balances, upcoming }: Overview) {
    const looks = [
        ...balances.accounts.map((account) => account.look),
        ...upcoming.charges.map((charge) => charge.look),
    ];
    return [...new Set(looks.flatMap((look) => (look?.imageKey ? [look.imageKey] : [])))].toSorted();
}

export const photoUrlsQuery = (convex: ConvexQueryClient | undefined, keys: readonly string[]) =>
    queryOptions({
        enabled: Boolean(convex) && keys.length > 0,
        queryFn: async () => {
            const client = convex?.serverHttpClient ?? convex?.convexClient;
            if (!client) {
                return [];
            }
            return client.mutation(api.photos.readUrls, { keys: [...keys] });
        },
        queryKey: ["photoUrls", keys],
        refetchInterval: PHOTO_REMINT_MS,
        staleTime: PHOTO_REMINT_MS,
    });

export const toPhotoUrls = (minted: readonly { key: string; url: string }[]): PhotoUrls =>
    new Map(minted.map((photo) => [photo.key, photo.url]));

export function usePhotoUrls(overview: Overview): PhotoUrls {
    const { convexQueryClient } = useRouteContext({ from: "/_account/app" });
    const { data } = useQuery({
        ...photoUrlsQuery(convexQueryClient, photoKeys(overview)),
        placeholderData: keepPreviousData,
        select: toPhotoUrls,
    });
    return data ?? NO_PHOTOS;
}
