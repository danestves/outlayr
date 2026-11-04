import type { RedeemStatus } from "@outlayr/backend/confect/referrals.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";

import { META_KEYS, setMeta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
import type { TranslationKey } from "@/i18n/catalog";
import { translateNow } from "@/i18n/runtime";
import {
    cloudAction,
    cloudMutation,
    cloudQuery,
    isCloudAuthenticated,
    subscribeCloudAuthenticated,
} from "@/lib/convex";
import { notifyFailure, notifyGift } from "@/lib/notify";
import { reloadProEntitlement } from "@/lib/revenuecat";
import { createCommand } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { fireAtomCommand } from "@/state/use-atom-action";

export type ClaimOutcome = RedeemStatus | "offline";

export const REFUSAL_COPY = {
    hadPro: "referrals.refusal.hadPro",
    invalid: "referrals.refusal.invalid",
    notNew: "referrals.refusal.notNew",
    offline: "referrals.refusal.offline",
    own: "referrals.refusal.own",
    rateLimited: "referrals.refusal.rateLimited",
    signedOut: "referrals.refusal.offline",
    unavailable: "referrals.refusal.unavailable",
    used: "referrals.refusal.used",
} as const satisfies Record<Exclude<ClaimOutcome, "claimed">, TranslationKey>;

export const inviterAtom = Atom.family((code: string) =>
    Atom.make(cloudQuery(api.referrals.inviter, { code })).pipe(Atom.withLabel("referrals:inviter"))
);

export const inviteCodeAtom = Atom.family((_accountId: string) =>
    Atom.make(cloudMutation(api.referrals.ensureCode, {})).pipe(Atom.withLabel("referrals:code"))
);

const claimInvite = Effect.fn("Referrals.claim")(function* claimInvite(code: string) {
    const outcome: ClaimOutcome = yield* cloudAction(api.referrals.redeem, { code }).pipe(
        Effect.catchTags({ CloudError: () => Effect.succeed("offline" as const) })
    );
    if (outcome === "claimed") {
        yield* reloadProEntitlement().pipe(Effect.ignore);
    }
    return outcome;
});

export const claimInviteCommand = createCommand({ execute: claimInvite, label: "referrals:claim" });

export const markRewardsSeenCommand = createCommand({
    execute: ({ db, seenAt }: { db: Database; seenAt: number }) =>
        setMeta(db, META_KEYS.referralRewardSeen, String(seenAt)),
    label: "referrals:mark-seen",
});

export function announceClaim(outcome: ClaimOutcome): void {
    if (outcome === "claimed") {
        notifyGift({ title: translateNow("referrals.claim.claimed") });
        return;
    }
    notifyFailure({ title: translateNow(REFUSAL_COPY[outcome]) });
}

let stopWaiting: (() => void) | null = null;

export function cancelPendingClaim(): void {
    stopWaiting?.();
    stopWaiting = null;
}

function claimInBackground(code: string): void {
    fireAtomCommand(appAtomRegistry, claimInviteCommand, code, {
        onSuccess: (outcome) => {
            if (outcome === "offline" || outcome === "signedOut" || outcome === "unavailable") {
                notifyFailure({
                    actionLabel: translateNow("common.retry"),
                    onActionPress: () => claimInBackground(code),
                    title: translateNow(REFUSAL_COPY[outcome]),
                });
                return;
            }
            announceClaim(outcome);
        },
    });
}

export function claimOnceSignedIn(code: string): void {
    cancelPendingClaim();
    const unsubscribe = subscribeCloudAuthenticated(() => {
        if (!isCloudAuthenticated()) {
            return;
        }
        unsubscribe();
        stopWaiting = null;
        claimInBackground(code);
    });
    stopWaiting = unsubscribe;
}
