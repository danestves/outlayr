import { addDays } from "@outlayr/money/calendar";

import type { Plan } from "./pro-plans";
import type { ProStatus } from "./pro-status";

export const YEAR_SHEET_LEAD_DAYS = 7;

const SAME_RENEWAL_MS = 30 * 24 * 60 * 60 * 1000;

export function yearSheetRenewal({
    held,
    now,
    seenMs,
}: {
    held: { plan: Pick<Plan, "kind">; status: ProStatus } | null;
    now: Date;
    seenMs: number;
}): Date | null {
    if (held?.plan.kind !== "annual" || held.status.kind !== "renews") {
        return null;
    }
    const { on } = held.status;
    const soon = on.getTime() > now.getTime() && on.getTime() <= addDays(now, YEAR_SHEET_LEAD_DAYS).getTime();
    return soon && on.getTime() - seenMs > SAME_RENEWAL_MS ? on : null;
}
