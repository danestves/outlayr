import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useState } from "react";

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
import { topBlockOf } from "./top-block";

interface PlanPick {
    kind: PlanKind;
    plans: readonly Plan[];
}

function selectedKind(pick: PlanPick | null, plans: readonly Plan[] | null): PlanKind | null {
    if (pick !== null && pick.plans === plans) {
        return pick.kind;
    }
    return plans?.find((candidate) => candidate.kind === "annual")?.kind ?? plans?.[0]?.kind ?? null;
}

/** Plans, purchase, restore and the entitlement states both paywall variants render. */
export function usePaywallFlow(variant: typeof PaywallVariant.Type) {
    const router = useRouter();
    const navigation = useNavigation();
    const entitlement = useRevenueCat();
    const isPro = entitlement.kind === "pro";
    const isMirrored = isPro && entitlement.mirrored;
    const { accountId } = useAuthSession();
    const { trigger: triggerParam } = useLocalSearchParams<{ trigger?: string }>();
    const autolog = useAutologUsage(useDatabase());
    const block = topBlockOf(paywallTriggerOf(triggerParam), autolog.used);
    const [busy, setBusy] = useState<"buy" | "confirm" | "restore" | null>(null);
    const [attempt, setAttempt] = useState(0);
    const loaded = useAtomValue(paywallPlansAtom({ accountId, attempt }));
    const plans = AsyncResult.isSuccess(loaded) ? loaded.value : null;
    const failed = AsyncResult.isFailure(loaded);
    const [pick, setPick] = useState<PlanPick | null>(null);
    const selected = selectedKind(pick, plans);
    const plan = plans?.find((candidate) => candidate.kind === selected) ?? null;
    const [failure, setFailure] = useState<TranslationKey | null>(null);

    const retry = () => {
        setAttempt((count) => count + 1);
    };

    const select = (kind: PlanKind) => {
        if (plans !== null) {
            setPick({ kind, plans });
        }
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
                posthog?.capture("purchase_finished", { outcome: "failed", plan: plan?.kind ?? null, variant });
                setFailure("pro.failedBody");
            },
            onSettled: () => setBusy(null),
            onSuccess: ({ mirrored, outcome }) => {
                posthog?.capture("purchase_finished", { outcome, plan: plan?.kind ?? null, variant });
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
        confirmEntitlement(accountId);
    };

    const buy = () => {
        if (plan === null) {
            return;
        }
        setBusy("buy");
        setFailure(null);
        posthog?.capture("purchase_started", { plan: plan.kind, variant });
        buyPlan({ accountId, offer: plan.offer });
    };

    const restore = () => {
        setBusy("restore");
        setFailure(null);
        restorePlan(accountId);
    };

    const empty = failed || (plans !== null && plans.length === 0);
    // A build without a backend cannot deliver Pro, so it takes no money for it.
    const noCloud = !proSellable();
    const needsAccount = !noCloud && accountId === null;
    const pitches = !(isPro || noCloud);
    const canBuy = pitches && !needsAccount;

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
        needsAccount,
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
