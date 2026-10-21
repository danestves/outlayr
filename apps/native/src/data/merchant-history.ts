import { useMemo } from "react";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useLiveQuery } from "./live-query";
import { recentMerchantNotesQuery, recentMerchants } from "./merchant-history-core";

const RECENT_MERCHANT_LIMIT = 6;

export function useRecentMerchants(db: Database, income: boolean): string[] {
    const rows = useLiveQuery(transactions, () => recentMerchantNotesQuery(db, income), [income]);
    return useMemo(() => recentMerchants(rows, RECENT_MERCHANT_LIMIT), [rows]);
}
