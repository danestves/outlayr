import { checkedAge } from "@/domain/balance-check";
import type { TranslateFn } from "@/i18n/context";

export interface ListChecked {
    stale: boolean;
    text: string;
}

export function listCheckedWording(t: TranslateFn, checkedAt: Date | null, nowMs: number): ListChecked | null {
    const age = checkedAge(checkedAt, nowMs);
    if (age.state === "never") {
        return null;
    }
    if (age.state === "today") {
        return { stale: false, text: t("accounts.check.listToday") };
    }
    if (age.state === "yesterday") {
        return { stale: false, text: t("accounts.check.listYesterday") };
    }
    if (age.state === "daysAgo") {
        return { stale: false, text: t("accounts.check.listDaysAgo", { count: age.days }) };
    }
    return { stale: true, text: t("accounts.check.listStale", { count: age.days }) };
}

export function cardCheckedTitle(t: TranslateFn, checkedAt: Date | null, nowMs: number): string {
    const age = checkedAge(checkedAt, nowMs);
    if (age.state === "never") {
        return t("accounts.check.never");
    }
    if (age.state === "today") {
        return t("accounts.check.today");
    }
    if (age.state === "yesterday") {
        return t("accounts.check.yesterday");
    }
    return t("accounts.check.daysAgo", { count: age.days });
}
