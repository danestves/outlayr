import type { Plan, PlanKind } from "@/domain/pro-plans";
import type { TranslationKey } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";

export function unitOf(plan: Plan, t: TranslateFn): string | null {
    if (plan.kind === "lifetime") {
        return t("pro.plan.once");
    }
    if (plan.kind === "monthly") {
        return t("pro.plan.perMonthBare");
    }
    return plan.perMonth === null ? null : t("pro.plan.perMonth", { price: plan.perMonth });
}

export function noteOf(plan: Plan, t: TranslateFn): string | null {
    const parts = [
        plan.trialDays === null ? null : t("pro.plan.trial", { days: plan.trialDays }),
        plan.savingsPercent === null ? null : t("pro.plan.save", { percent: plan.savingsPercent }),
    ].filter((part): part is string => part !== null);
    return parts.length === 0 ? null : parts.join(" · ");
}

const BUY_LABEL = {
    annual: "pro.cta.buyYearly",
    lifetime: "pro.cta.buy",
    monthly: "pro.cta.buyMonthly",
} as const satisfies Record<PlanKind, TranslationKey>;

const THEN_LABEL = {
    annual: "pro.cta.thenYearly",
    lifetime: "pro.cta.then",
    monthly: "pro.cta.thenMonthly",
} as const satisfies Record<PlanKind, TranslationKey>;

export function ctaLabel(plan: Plan | null, t: TranslateFn): string {
    if (plan === null) {
        return t("pro.cta.continue");
    }
    if (plan.trialDays === null) {
        return t(BUY_LABEL[plan.kind], { price: plan.priceString });
    }
    return t("pro.cta.start", { days: plan.trialDays });
}

/** What the first charge will be, for a plan that starts free. */
export function thenLabel(plan: Plan | null, t: TranslateFn): string | null {
    return plan === null || plan.trialDays === null ? null : t(THEN_LABEL[plan.kind], { price: plan.priceString });
}
