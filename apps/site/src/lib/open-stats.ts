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
    if (!url) {
        return null;
    }
    try {
        return await new ConvexHttpClient(url).query(latest, {});
    } catch (error) {
        if (error instanceof Error && error.message.includes("Could not find public function")) {
            return null;
        }
        throw error;
    }
});

const PROOF_TIMEOUT_MS = 1500;

export const getHomeStats = createServerFn({ method: "GET" }).handler(async () => {
    const url = ENV.VITE_CONVEX_URL;
    if (!url) {
        return null;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(resolve, PROOF_TIMEOUT_MS, null);
    });
    try {
        const stats = await Promise.race([new ConvexHttpClient(url).query(latest, {}), timeout]);
        const week = stats?.posthog?.weeks.at(-1);
        return {
            mergedPrs: stats?.github?.months.at(-1)?.mergedPrs ?? null,
            week: week && week.entries > 1 && week.people > 1 && week.countries > 1 ? week : null,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
});
