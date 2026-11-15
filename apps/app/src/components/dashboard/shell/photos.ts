import type { ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { keepPreviousData, queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import type { Overview, PhotoUrls } from "@/components/ledger/overview";

const PHOTO_REMINT_MS = 50 * 60_000;
const MIN_REMINT_WAIT_MS = 60_000;
const PHOTO_URLS = "photoUrls";

export const NO_PHOTOS: PhotoUrls = new Map();

const photoMintUsable = (mintedAt: number, now: number) => now - mintedAt < PHOTO_REMINT_MS;

export function photoKeys({ balances, upcoming }: Overview) {
    const looks = [
        ...balances.accounts.map((account) => account.look),
        ...upcoming.charges.map((charge) => charge.look),
    ];
    return [...new Set(looks.flatMap((look) => (look?.imageKey ? [look.imageKey] : [])))].toSorted();
}

export interface MintedPhotos {
    keys: readonly string[];
    minted: readonly { key: string; url: string }[];
    mintedAt: number;
}

export const photoSeedQuery = queryOptions<MintedPhotos>({
    gcTime: Number.POSITIVE_INFINITY,
    queryFn: skipToken,
    queryKey: ["photoSeed"],
    staleTime: Number.POSITIVE_INFINITY,
});

export const usePhotoSeed = () => useQuery(photoSeedQuery).data;

function seededFor(seed: MintedPhotos | undefined, keys: readonly string[]) {
    if (!seed || !photoMintUsable(seed.mintedAt, Date.now())) {
        return undefined;
    }
    const asked = new Set(seed.keys);
    if (!keys.every((key) => asked.has(key))) {
        return undefined;
    }
    const wanted = new Set(keys);
    return seed.minted.filter((photo) => wanted.has(photo.key));
}

export const photoUrlsQuery = (convex: ConvexQueryClient | undefined, keys: readonly string[], seed?: MintedPhotos) =>
    queryOptions({
        enabled: Boolean(convex) && keys.length > 0,
        gcTime: PHOTO_REMINT_MS,
        initialData: seededFor(seed, keys),
        initialDataUpdatedAt: seed?.mintedAt,
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

export const toPhotoUrls = (minted: readonly { key: string; url: string }[]): PhotoUrls =>
    new Map(minted.map((photo) => [photo.key, photo.url]));

export function usePhotoUrls(overview: Overview): PhotoUrls {
    const { convexQueryClient } = useRouteContext({ from: "/_account/_app" });
    const seed = usePhotoSeed();
    const { data } = useQuery({
        ...photoUrlsQuery(convexQueryClient, photoKeys(overview), seed),
        placeholderData: keepPreviousData,
        select: toPhotoUrls,
    });
    return data ?? NO_PHOTOS;
}
