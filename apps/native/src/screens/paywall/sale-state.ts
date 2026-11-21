interface SaleInput {
    failed: boolean;
    isPro: boolean;
    noCloud: boolean;
    plans: readonly unknown[] | null;
}

export function saleStateOf({ failed, isPro, noCloud, plans }: SaleInput) {
    if (isPro) {
        return "pro";
    }
    if (noCloud) {
        return "no_cloud";
    }
    if (failed) {
        return "plans_failed";
    }
    if (plans === null) {
        return "loading";
    }
    return plans.length === 0 ? "no_plans" : "ready";
}
