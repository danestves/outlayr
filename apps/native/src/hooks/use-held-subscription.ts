import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import { useRevenueCat } from "@/contexts/revenuecat-context";
import { heldPlan } from "@/domain/pro-plans";
import type { Plan } from "@/domain/pro-plans";
import type { ProStatus } from "@/domain/pro-status";
import { useAuthSession } from "@/lib/auth-session";
import { heldPlansAtom } from "@/lib/paywall-plans";
import { proTermAtom, UNKNOWN_PRO_TERM } from "@/lib/pro-status";

export interface HeldSubscription {
    manageUrl: string | null;
    plan: Plan;
    status: ProStatus;
}

export function useHeldSubscription(): HeldSubscription | null {
    const { accountId } = useAuthSession();
    const configured = useRevenueCat().kind !== "unconfigured";
    const { manageUrl, productId, status } = AsyncResult.getOrElse(
        useAtomValue(proTermAtom(configured)),
        () => UNKNOWN_PRO_TERM
    );
    const held = status?.kind === "renews" || status?.kind === "ends";
    const plans = useAtomValue(heldPlansAtom({ accountId, held }));
    const plan = held && AsyncResult.isSuccess(plans) ? heldPlan(plans.value, productId) : null;
    return plan === null || status === null ? null : { manageUrl, plan, status };
}
