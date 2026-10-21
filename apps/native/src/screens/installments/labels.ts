import type { InstallmentRow } from "@/data/installments-core";
import { formatSentenceDate } from "@/domain/dates";
import type { InstallmentStanding, PlanStanding } from "@/domain/installments";
import { daysBetween, startOfLocalDay } from "@/domain/local-day";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

export function installmentTitle(t: TranslateFn, row: InstallmentRow, count: number): string {
    return row.sequence === 0 ? t("installments.upfront") : t("installments.cuota", { count, index: row.sequence });
}

/** Null once the day has passed. */
export function dueIn(t: TranslateFn, dueDate: Date, nowMs: number): string | null {
    const days = daysBetween(startOfLocalDay(nowMs), dueDate.getTime());
    if (days < 0) {
        return null;
    }
    return days === 0 ? t("common.today").toLowerCase() : t("installments.inDays", { count: days });
}

export function scheduleRowWording(
    t: TranslateFn,
    language: Language,
    row: InstallmentStanding<InstallmentRow>,
    { isNext, money, nowMs }: { isNext: boolean; money: (value: number) => string; nowMs: number }
) {
    const due = isNext ? dueIn(t, row.row.dueDate, nowMs) : null;
    const when = [formatSentenceDate(row.row.dueDate, language), due].filter(Boolean).join(" · ");
    let status: { text: string; tone: "overdue" | "paid" | "partial" } | null = null;
    if (row.status === "paid") {
        status = { text: t("installments.paid"), tone: "paid" };
    } else if (row.overdue) {
        status = { text: t("installments.overdue"), tone: "overdue" };
    } else if (row.status === "partial") {
        status = { text: t("installments.partly", { amount: money(row.covered) }), tone: "partial" };
    }
    const breakdown =
        row.row.fee > 0
            ? t("installments.fee.breakdown", { amount: money(row.row.amount), fee: money(row.row.fee) })
            : null;
    return { breakdown, status, when };
}

export function lateFeeSuggestion(
    standing: PlanStanding<InstallmentRow>
): { row: InstallmentRow; visible: boolean } | null {
    const open = standing.rows.filter((row) => row.status !== "paid");
    const last = open.findLast((row) => row.row.sequence > 0);
    if (!last) {
        return null;
    }
    return { row: last.row, visible: open.some((row) => row.overdue) && !open.some((row) => row.row.fee > 0) };
}
