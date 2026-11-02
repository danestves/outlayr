import { createServerFn } from "@tanstack/react-start";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

import { ENV } from "@/env";

type Monthly<K extends string> = readonly ({ readonly month: string } & Readonly<Record<K, number>>)[];

export interface OpenStats {
    readonly accounts: { readonly months: Monthly<"added">; readonly weeks: readonly number[] };
    readonly computedAt: number;
    readonly github: {
        readonly contributors: number;
        readonly months: Monthly<"mergedPrs">;
        readonly stars: number;
    } | null;
    readonly posthog: {
        readonly months: Monthly<"entries" | "people">;
        readonly weeks: readonly { readonly countries: number; readonly entries: number; readonly people: number }[];
    } | null;
    readonly revenue: { readonly activeSubscriptions: number; readonly months: Monthly<"proceeds"> } | null;
}

const latest = makeFunctionReference<"query", Record<string, never>, OpenStats | null>("openStats:latest");

export const getOpenStats = createServerFn({ method: "GET" }).handler(async () => {
    const url = ENV.VITE_CONVEX_URL;
    return url ? await new ConvexHttpClient(url).query(latest, {}) : null;
});
