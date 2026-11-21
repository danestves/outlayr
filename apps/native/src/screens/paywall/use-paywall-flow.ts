import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useAutologUsage } from "@/data/autolog-cap";
import { paywallTriggerOf } from "@/domain/paywall-trigger";
import type { Plan, PlanKind } from "@/domain/pro-plans";
import { proSellable } from "@/hooks/use-pro-locked";
import type { TranslationKey } from "@/i18n/catalog";
import { useAuthSession } from "@/lib/auth-session";
import { paywallPlansAtom } from "@/lib/paywall-plans";
import { posthog } from "@/lib/posthog";
import type { PaywallVariant } from "@/lib/posthog";
import { SILENT } from "@/state/atom-command";
import { buyPlanCommand, confirmEntitlementCommand, restorePlanCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { purchaseNext, restoreNext } from "./purchase-result";
import { saleStateOf } from "./sale-state";
import { topBlockOf } from "./top-block";

function purchaseProperties(plan: Plan | null, variant: typeof PaywallVariant.Type) {
    const product = plan?.offer.product;
    return {
        period: product?.subscriptionPeriod ?? null,
        plan: plan?.kind ?? null,
        product_id: product?.identifier ?? null,
        variant,
    };
}

// By kind, not list: a guest made at checkout reloads the plans, and a cancelled sheet keeps what was picked.
function selectedKind(pick: PlanKind | null, plans: readonly Plan[] | null): PlanKind | null {
    if (pick !== null && plans?.some((candidate) => candidate.kind === pick) === true) {
        return pick;
    }
    const fallback = plans?.find((candidate) => candidate.kind === "annual") ?? plans?.[0];
    return fallback?.kind ?? null;
}

/** Plans, purchase, restore and the entitlement states both paywall variants render. */
export function usePaywallFlow(variant: typeof PaywallVariant.Type) {
    const router = useRouter();
    const navigation = useNavigation();
    const entitlement = useRevenueCat();
    const isPro = entitlement.kind === "pro";
    const isMirrored = isPro && entitlement.mirrored;
    const { billingId } = useAuthSession();
    const { trigger: triggerParam } = useLocalSearchParams<{ trigger?: string }>();
    const autolog = useAutologUsage(useDatabase());
    const trigger = paywallTriggerOf(triggerParam);
    const block = topBlockOf(trigger, autolog.used);
    const [busy, setBusy] = useState<"buy" | "confirm" | "restore" | null>(null);
    const [attempt, setAttempt] = useState(0);
    const loaded = useAtomValue(paywallPlansAtom({ accountId: billingId, attempt }));
    const plans = AsyncResult.isSuccess(loaded) ? loaded.value : null;
    const failed = AsyncResult.isFailure(loaded);
    const [pick, setPick] = useState<PlanKind | null>(null);
    const selected = selectedKind(pick, plans);
    const plan = plans?.find((candidate) => candidate.kind === selected) ?? null;
    const [failure, setFailure] = useState<TranslationKey | null>(null);
    const sale = useRef(purchaseProperties(null, variant));

    const retry = () => {
        setAttempt((count) => count + 1);
    };

    const select = (kind: PlanKind) => {
        setPick(kind);
    };

    const leave = () => {
        if (navigation.isFocused()) {
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
                    leave();
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
                    leave();
                }
            },
        },
        SILENT
    );

    const confirm = () => {
        setBusy("confirm");
        setFailure(null);
        confirmEntitlement(billingId);
    };

    const startPurchase = (target: Plan) => {
        setBusy("buy");
        setFailure(null);
        sale.current = purchaseProperties(target, variant);
        posthog?.capture("purchase_started", { ...sale.current, trial_days: target.trialDays });
        buyPlan({ accountId: billingId, offer: target.offer });
    };

    // A build without a backend cannot deliver Pro, so it takes no money for it.
    const noCloud = !proSellable();

    const buy = () => {
        if (plan === null) {
            return;
        }
        startPurchase(plan);
    };

    const restore = () => {
        setBusy("restore");
        setFailure(null);
        restorePlan(billingId);
    };

    const empty = failed || (plans !== null && plans.length === 0);
    const pitches = !(isPro || noCloud);
    const canBuy = pitches;

    const reportDismissed = useEffectEvent(() => {
        const saleState = saleStateOf({ failed, isPro, noCloud, plans });
        if (saleState !== "pro") {
            posthog?.capture("paywall_dismissed", { sale_state: saleState, trigger, variant });
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- reports the paywall closing, however it was dismissed
    useEffect(() => () => reportDismissed(), []);

    return {
        autolog,
        block,
        busy,
        buy,
        canBuy,
        confirm,
        empty,
        failure,
        isMirrored,
        isPro,
        leave,
        logsWaiting: canBuy && block === "autolog" && autolog.waiting > 0,
        noCloud,
        pitches,
        plan,
        plans,
        restore,
        retry,
        select,
        selected,
    };
}
