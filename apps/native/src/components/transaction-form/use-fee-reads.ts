import type { Account } from "@/data/accounts-core";
import { feeRatesOn, lastFeeCategoryId, lastForeignFeeRate } from "@/data/card-fees-core";
import { getCategoryById } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { useRatesRead } from "@/data/live-query";
import type { Database } from "@/db/client";

interface FeeReadsArgs {
    account: Account | null;
    category: Category | null;
    db: Database;
    feeCategoryId: string | null;
    foreignCharge: boolean;
    mode: "create" | "edit";
}

export function useFeeReads({ account, category, db, feeCategoryId, foreignCharge, mode }: FeeReadsArgs) {
    return useRatesRead(
        () => ({
            feeCategory: getCategoryById(db, feeCategoryId ?? lastFeeCategoryId(db) ?? "") ?? category,
            feeRates: account == null ? [] : feeRatesOn(db, account.id),
            suggestedFeeRate:
                mode === "create" && foreignCharge && account != null
                    ? lastForeignFeeRate(db, account.id, account.currency)
                    : null,
        }),
        [db, account, category, feeCategoryId, foreignCharge, mode]
    );
}
