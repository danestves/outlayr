import type { ReferralOverview } from "@outlayr/backend/confect/referrals.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQueries } from "convex/react";

const OVERVIEW_REQUEST = { overview: { args: {}, query: api.referrals.overview } };

export function useReferralOverview(): ReferralOverview | null | undefined {
    const result: ReferralOverview | null | Error | undefined = useQueries(OVERVIEW_REQUEST).overview;
    return result instanceof Error ? undefined : result;
}
