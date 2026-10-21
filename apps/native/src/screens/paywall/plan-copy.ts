import type { Plan } from "@/domain/pro-plans";
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
