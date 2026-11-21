import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { usePreventRemove } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import type { ExitOffer, Plan } from "@/domain/pro-plans";
import { useTranslation } from "@/i18n/context";
import { exitOfferAtom } from "@/lib/paywall-plans";
import { posthog } from "@/lib/posthog";
import { SILENT } from "@/state/atom-command";
import { markExitOfferSeenCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { KeepsLine } from "./keeps-line";
import { PaywallCta } from "./paywall-cta";
import type { LeaveOutcome } from "./use-paywall-flow";

interface ExitFlow {
    accountId: string | null;
    busy: string | null;
    buyExitOffer: (plan: Plan) => void;
    canBuy: boolean;
    isPro: boolean;
    leave: (outcome?: LeaveOutcome) => void;
    left: RefObject<boolean>;
    needsAccount: boolean;
    ownsLeave: boolean;
}

/** Shown once per device, the first time someone leaves a paywall without buying. */
export function useExitOffer(flow: ExitFlow) {
    const db = useDatabase();
    const seen = useMeta(db, "exitOfferSeen");
    const offer = AsyncResult.getOrElse(useAtomValue(exitOfferAtom(flow.accountId)), () => null);
    const [open, setOpen] = useState(false);
    const [settled, setSettled] = useState(false);
    const resume = useRef<(() => void) | null>(null);
    const markSeen = useAtomAction(markExitOfferSeenCommand, {}, SILENT);
    const armed =
        offer !== null && !seen && !settled && flow.canBuy && !flow.needsAccount && !flow.isPro && flow.busy === null;

    const show = () => {
        if (!open && offer !== null) {
            setOpen(true);
            markSeen(db);
            posthog?.capture("exit_offer_shown", { percent_off: offer.percentOff });
        }
    };

    // A screen that owns leaving (onboarding) finishes its flow on system Back instead of being popped. Once any
    // leave has started, removals pass: the leave dispatches before a re-render could lift the prevention.
    usePreventRemove(armed || flow.ownsLeave, ({ repeat }) => {
        if (flow.left.current) {
            repeat();
        } else if (armed) {
            resume.current = flow.ownsLeave ? null : repeat;
            show();
        } else if (flow.busy === null) {
            flow.leave("dismissed");
        }
    });

    const decline = () => {
        setSettled(true);
        setOpen(false);
        posthog?.capture("exit_offer_declined", { percent_off: offer?.percentOff ?? null });
        const go = resume.current;
        resume.current = null;
        if (go === null) {
            flow.leave("dismissed");
        } else {
            go();
        }
    };

    const accept = () => {
        if (offer !== null) {
            setSettled(true);
            resume.current = null;
            flow.buyExitOffer(offer.plan);
        }
    };

    /** For a "Not now" that leaves without a navigation event. */
    const requestLeave = () => {
        if (armed) {
            show();
        } else {
            flow.leave("dismissed");
        }
    };

    return { accept, decline, offer: open && !flow.isPro ? offer : null, requestLeave };
}

export function ExitOfferSheet({
    busy,
    failure,
    offer,
    onAccept,
    onDecline,
}: {
    busy: boolean;
    failure: string | null;
    offer: ExitOffer;
    onAccept: () => void;
    onDecline: () => void;
}) {
    const t = useTranslation();
    return (
        <View className="absolute inset-0 justify-end">
            <Animated.View className="absolute inset-0 bg-black/40" entering={FadeIn.duration(200)}>
                <Pressable
                    accessibilityLabel={t("pro.exit.decline")}
                    className="flex-1"
                    disabled={busy}
                    onPress={onDecline}
                />
            </Animated.View>
            <Animated.View
                accessibilityViewIsModal
                className="bg-background pb-safe-offset-4 rounded-t-[28px] px-5 pt-6"
                entering={SlideInDown.springify().damping(22).stiffness(220)}
            >
                <MonoLabel className="text-tint">{t("pro.exit.eyebrow", { percent: offer.percentOff })}</MonoLabel>
                <Text accessibilityRole="header" className="font-sans-semibold text-foreground text-title pt-1.5">
                    {t("pro.exit.title", { price: offer.firstYear })}
                </Text>
                <Text className="text-muted-foreground text-subtitle pt-1 pb-5 leading-snug">
                    {t("pro.exit.renews", { price: offer.plan.priceString })}
                </Text>
                <KeepsLine />
                {failure === null ? null : <Text className="text-danger text-subtitle pb-3">{failure}</Text>}
                <PaywallCta
                    busy={busy}
                    busyLabel={t("pro.cta.unlocking")}
                    disabled={busy}
                    label={t("pro.exit.cta", { percent: offer.percentOff })}
                    onPress={onAccept}
                    testID="exit-offer-cta"
                />
                {busy ? null : (
                    <Button className="mt-2.5 rounded-full" fullWidth onPress={onDecline} size="md" variant="ghost">
                        {t("pro.exit.decline")}
                    </Button>
                )}
            </Animated.View>
        </View>
    );
}
