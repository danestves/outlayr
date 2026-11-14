import type { ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import type { Overview, PhotoUrls } from "@/components/ledger/overview";

export const PHOTO_REMINT_MS = 50 * 60_000;
const MIN_REMINT_WAIT_MS = 60_000;
const PHOTO_URLS = "photoUrls";

export const NO_PHOTOS: PhotoUrls = new Map();

export const isPhotoKey = (queryKey: readonly unknown[]) => queryKey[0] === PHOTO_URLS;

export const photoMintUsable = (mintedAt: number, now: number) => now - mintedAt < PHOTO_REMINT_MS;

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
        gcTime: PHOTO_REMINT_MS,
        queryFn: async () => {
            if (!convex) {
                return [];
            }
            return convex.convexClient.mutation(api.photos.readUrls, { keys: [...keys] });
        },
        queryKey: [PHOTO_URLS, keys],
        refetchInterval: (query) =>
            Math.max(query.state.dataUpdatedAt + PHOTO_REMINT_MS - Date.now(), MIN_REMINT_WAIT_MS),
        staleTime: PHOTO_REMINT_MS,
    });

export interface MintedPhotos {
    keys: readonly string[];
    minted: readonly { key: string; url: string }[];
    mintedAt: number;
}

export function mintedPhotos(client: QueryClient, keys: readonly string[]): MintedPhotos | undefined {
    const { queryKey } = photoUrlsQuery(undefined, keys);
    const minted = client.getQueryData(queryKey);
    return minted && { keys, minted, mintedAt: client.getQueryState(queryKey)?.dataUpdatedAt ?? 0 };
}

export function seedPhotos(client: QueryClient, photos: MintedPhotos | undefined) {
    if (photos && photoMintUsable(photos.mintedAt, Date.now())) {
        client.setQueryData(photoUrlsQuery(undefined, photos.keys).queryKey, [...photos.minted], {
            updatedAt: photos.mintedAt,
        });
    }
}

export const toPhotoUrls = (minted: readonly { key: string; url: string }[]): PhotoUrls =>
    new Map(minted.map((photo) => [photo.key, photo.url]));

export function usePhotoUrls(overview: Overview): PhotoUrls {
    const { convexQueryClient } = useRouteContext({ from: "/_account/_app" });
    const { data } = useQuery({
        ...photoUrlsQuery(convexQueryClient, photoKeys(overview)),
        placeholderData: keepPreviousData,
        select: toPhotoUrls,
    });
    return data ?? NO_PHOTOS;
}
