interface SaleInput {
    failed: boolean;
    isPro: boolean;
    needsAccount: boolean;
    noCloud: boolean;
    plans: readonly unknown[] | null;
}

export function saleStateOf({ failed, isPro, needsAccount, noCloud, plans }: SaleInput) {
    if (isPro) {
        return "pro";
    }
    if (noCloud) {
        return "no_cloud";
    }
    if (needsAccount) {
        return "needs_account";
    }
    if (failed) {
        return "plans_failed";
    }
    if (plans === null) {
        return "loading";
    }
    return plans.length === 0 ? "no_plans" : "ready";
}
