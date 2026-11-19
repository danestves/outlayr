import { planViews } from "@/components/dashboard/installments/model";
import type { PlanView } from "@/components/dashboard/installments/model";
import { startOfDay } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { isActive } from "@/lib/recurring";
import type { RecurringModel, Schedule } from "@/lib/recurring";

export const SEEN_KEY = "notificationsSeenAt";

interface Arrival {
    arrivedAt: number;
    day: string;
    id: string;
}

export type Notice =
    | (Arrival & { kind: "recurring"; schedule: Schedule })
    | (Arrival & { amount: number; kind: "installment"; plan: PlanView });

export function noticesOf(ledger: Ledger, recurring: RecurringModel): Notice[] {
    const charges = recurring.schedules.filter(isActive).flatMap((schedule) =>
        schedule.due.map((charge): Notice => ({
            arrivedAt: startOfDay(ledger, charge.day),
            day: charge.day,
            id: `recurring:${schedule.id}:${charge.day}`,
            kind: "recurring",
            schedule,
        }))
    );
    const installments = planViews(ledger).flatMap((plan) =>
        plan.rows
            .filter((row) => row.status !== "paid" && row.day <= ledger.today)
            .map((row): Notice => ({
                amount: row.remaining,
                arrivedAt: startOfDay(ledger, row.day),
                day: row.day,
                id: `installment:${row.id}`,
                kind: "installment",
                plan,
            }))
    );
    return [...charges, ...installments].toSorted((a, b) => b.arrivedAt - a.arrivedAt || a.id.localeCompare(b.id));
}

export function seenAtOf(raw: string | null | undefined): number | null {
    const at = Number(raw);
    return raw && Number.isFinite(at) ? at : null;
}

/** A notice arrives when its day starts in the ledger's zone, so one due today stays read once opened today. */
export const isUnread = (notice: Pick<Notice, "arrivedAt">, seenAt: number | null) =>
    seenAt === null || notice.arrivedAt > seenAt;
