import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useAutologUsage } from "@/data/autolog-cap";
import { paywallTriggerOf } from "@/domain/paywall-trigger";
import type { PaywallTrigger } from "@/domain/paywall-trigger";
import type { Plan, PlanKind } from "@/domain/pro-plans";
import { proSellable } from "@/hooks/use-pro-locked";
import type { TranslationKey } from "@/i18n/catalog";
import { useAuthSession } from "@/lib/auth-session";
import { paywallPlansAtom } from "@/lib/paywall-plans";
import { posthog } from "@/lib/posthog";
import type { PaywallVariant } from "@/lib/posthog";
import { purchaseIntent } from "@/lib/purchase-intent";
import { SILENT } from "@/state/atom-command";
import { buyPlanCommand, confirmEntitlementCommand, restorePlanCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { purchaseNext, restoreNext } from "./purchase-result";
import { saleStateOf } from "./sale-state";
import { topBlockOf } from "./top-block";

interface PlanPick {
    kind: PlanKind;
    plans: readonly Plan[];
}

function purchaseProperties(
    plan: Plan | null,
    variant: typeof PaywallVariant.Type,
    trigger: typeof PaywallTrigger.Type,
    exitOffer = false
) {
    const product = plan?.offer.product;
    return {
        exit_offer: exitOffer,
        period: product?.subscriptionPeriod ?? null,
        plan: plan?.kind ?? null,
        product_id: product?.identifier ?? null,
        trigger,
        variant,
    };
}

function selectedKind(
    pick: PlanPick | null,
    plans: readonly Plan[] | null,
    preferred: PlanKind | undefined
): PlanKind | null {
    if (pick !== null && pick.plans === plans) {
        return pick.kind;
    }
    const fallback =
        plans?.find((candidate) => candidate.kind === preferred) ??
        plans?.find((candidate) => candidate.kind === "annual") ??
        plans?.[0];
    return fallback?.kind ?? null;
}

export type LeaveOutcome = "dismissed" | "pro";

export interface PaywallFlowOptions {
    /** Replaces closing the route, for a paywall shown as a step instead of a modal. */
    onLeave?: (outcome: LeaveOutcome) => void;
    trigger?: typeof PaywallTrigger.Type;
}

/** Who this build can sell Pro to right now. */
export function saleReach(accountId: string | null) {
    // A build without a backend cannot deliver Pro, so it takes no money for it.
    const noCloud = !proSellable();
    return { needsAccount: !noCloud && accountId === null, noCloud };
}

/** Plans, purchase, restore and the entitlement states both paywall variants render. */
export function usePaywallFlow(variant: typeof PaywallVariant.Type, options: PaywallFlowOptions = {}) {
    const router = useRouter();
    const navigation = useNavigation();
    const entitlement = useRevenueCat();
    const isPro = entitlement.kind === "pro";
    const isMirrored = isPro && entitlement.mirrored;
    const { accountId } = useAuthSession();
    const { trigger: triggerParam } = useLocalSearchParams<{ trigger?: string }>();
    const [resumed] = useState(() => {
        const handed = purchaseIntent.get();
        return handed?.handed ? handed : null;
    });
    const autolog = useAutologUsage(useDatabase());
    const trigger = options.trigger ?? paywallTriggerOf(triggerParam);
    const block = topBlockOf(trigger, autolog.used);
    const [busy, setBusy] = useState<"buy" | "confirm" | "restore" | null>(null);
    const [attempt, setAttempt] = useState(0);
    const loaded = useAtomValue(paywallPlansAtom({ accountId, attempt }));
    const plans = AsyncResult.isSuccess(loaded) ? loaded.value : null;
    const failed = AsyncResult.isFailure(loaded);
    const [pick, setPick] = useState<PlanPick | null>(null);
    const selected = selectedKind(pick, plans, resumed?.kind);
    const plan = plans?.find((candidate) => candidate.kind === selected) ?? null;
    const [failure, setFailure] = useState<TranslationKey | null>(null);
    const sale = useRef(purchaseProperties(null, variant, trigger));

    const retry = () => {
        setAttempt((count) => count + 1);
    };

    const select = (kind: PlanKind) => {
        if (plans !== null) {
            setPick({ kind, plans });
        }
    };

    const leave = (outcome: LeaveOutcome = "dismissed") => {
        if (options.onLeave) {
            options.onLeave(outcome);
        } else if (navigation.isFocused()) {
            router.back();
        }
    };

    /** For a customer the store calls Pro whose account has not been told yet. */
    const confirmEntitlement = useAtomAction(
        confirmEntitlementCommand,
        {
            onSettled: () => setBusy(null),
            onSuccess: (mirrored) => {
                if (!mirrored) {
                    setFailure("pro.syncPendingBody");
                }
            },
        },
        SILENT
    );
    const buyPlan = useAtomAction(
        buyPlanCommand,
        {
            onFailure: () => {
                posthog?.capture("purchase_finished", { ...sale.current, outcome: "failed", trial: false });
                setFailure("pro.failedBody");
            },
            onSettled: () => setBusy(null),
            onSuccess: ({ mirrored, outcome, trial }) => {
                posthog?.capture("purchase_finished", { ...sale.current, outcome, trial });
                const next = purchaseNext(outcome, mirrored);
                if (next.failure !== null) {
                    setFailure(next.failure);
                }
                if (next.leave) {
                    leave("pro");
                }
            },
        },
        SILENT
    );
    const restorePlan = useAtomAction(
        restorePlanCommand,
        {
            onFailure: () => setFailure("pro.restoreFailedBody"),
            onSettled: () => setBusy(null),
            onSuccess: ({ mirrored, restored }) => {
                const next = restoreNext(restored, mirrored);
                if (next.failure !== null) {
                    setFailure(next.failure);
                }
                if (next.leave) {
                    leave("pro");
                }
            },
        },
        SILENT
    );

    const confirm = () => {
        setBusy("confirm");
        setFailure(null);
        confirmEntitlement(accountId);
    };

    const startPurchase = (target: Plan, soldBy: typeof PaywallVariant.Type, exitOffer = false) => {
        setBusy("buy");
        setFailure(null);
        sale.current = purchaseProperties(target, soldBy, trigger, exitOffer);
        posthog?.capture("purchase_started", { ...sale.current, trial_days: target.trialDays });
        buyPlan({ accountId, offer: target.offer });
    };

    const buy = () => {
        if (plan === null) {
            return;
        }
        if (accountId === null) {
            purchaseIntent.set({ kind: plan.kind, trigger, variant });
            router.navigate("/settings/account");
            return;
        }
        startPurchase(plan, variant);
    };

    const buyExitOffer = (target: Plan) => {
        if (accountId !== null) {
            startPurchase(target, variant, true);
        }
    };

    const restore = () => {
        setBusy("restore");
        setFailure(null);
        restorePlan(accountId);
    };

    const empty = failed || (plans !== null && plans.length === 0);
    const { needsAccount, noCloud } = saleReach(accountId);
    const pitches = !(isPro || noCloud);
    const canBuy = pitches;
    const resuming = resumed !== null && accountId !== null && entitlement.kind === "free" && !entitlement.pending;
    const resumeTarget = resuming ? (plans?.find((candidate) => candidate.kind === resumed.kind) ?? null) : null;
    const resumeStarted = useRef(false);
    const startResumed = useEffectEvent((target: Plan) => startPurchase(target, resumed?.variant ?? variant));

    // oxlint-disable-next-line outlayr/react-effect-budget -- the sign-in lands before the plans do
    useEffect(() => {
        if (resumeTarget === null || resumeStarted.current) {
            return;
        }
        resumeStarted.current = true;
        startResumed(resumeTarget);
    }, [resumeTarget]);

    const reportDismissed = useEffectEvent(() => {
        const pending = purchaseIntent.get();
        if (pending?.handed) {
            purchaseIntent.clear();
        } else if (pending !== null) {
            return;
        }
        const saleState = saleStateOf({ failed, isPro, needsAccount, noCloud, plans });
        if (saleState !== "pro") {
            posthog?.capture("paywall_dismissed", { sale_state: saleState, trigger, variant });
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- reports the paywall closing, however it was dismissed
    useEffect(() => () => reportDismissed(), []);

    return {
        autolog,
        block,
        accountId,
        busy: busy ?? (resuming && plans === null && !failed ? "buy" : null),
        buy,
        buyExitOffer,
        canBuy,
        confirm,
        empty,
        failure,
        isMirrored,
        isPro,
        leave,
        logsWaiting: canBuy && block === "autolog" && autolog.waiting > 0,
        needsAccount,
        noCloud,
        ownsLeave: options.onLeave !== undefined,
        pitches,
        plan,
        plans,
        restore,
        retry,
        select,
        selected,
    };
}
