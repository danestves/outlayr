import type { Expires } from "@outlayr/backend/confect/sharedReports.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";

import { sharedLinksQuery } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";

import type { SharedReport } from "./share";

export type Lifetime = Exclude<typeof Expires.Type, "keep">;

export interface SharedLink {
    expiresAt: number | null;
    reportId: string;
    slug: string;
    unit: SharedReport["unit"];
}

const NONE: readonly SharedLink[] = [];
const WEEK_MS = 7 * 86_400_000;

/** The links that are on for this account, kept live so another tab's change shows here. */
export function useSharedLinks(): readonly SharedLink[] {
    const { data } = useQuery(sharedLinksQuery);
    return data ?? NONE;
}

/** The server keeps only the moment a link ends, so the choice shown is the nearest one still ahead. */
export function lifetimeOf(link: Pick<SharedLink, "expiresAt">, now: number): Lifetime {
    if (link.expiresAt === null) {
        return "never";
    }
    return link.expiresAt - now <= WEEK_MS ? "week" : "month";
}

export const sharedUrl = (slug: string, locale: string) =>
    `tryoutlayr.com${locale.startsWith("es") ? "/es" : ""}/r/${slug}`;

export const publishLink = (input: { expires: typeof Expires.Type; report: SharedReport; reportId: string }) =>
    convexClient().mutation(api.sharedReports.publish, input);

export const removeLink = (reportId: string) => convexClient().mutation(api.sharedReports.remove, { reportId });
