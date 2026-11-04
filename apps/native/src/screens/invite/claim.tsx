import { useAtomValue } from "@effect/atom-react/Hooks";
import GiftIcon from "@hugeicons-pro/core-stroke-rounded/GiftIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { formatReferralCode, normalizeReferralCode, REFERRAL_DAYS_TO_EARN } from "@outlayr/money/contract";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InlineFailure } from "@/components/form/inline-failure";
import { StepCta } from "@/components/import-sheet/step-cta";
import { Text } from "@/components/text";
import { useLongWait } from "@/hooks/use-long-wait";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import {
    announceClaim,
    cancelPendingClaim,
    claimInviteCommand,
    claimOnceSignedIn,
    inviterAtom,
    REFUSAL_COPY,
} from "@/lib/referrals";
import type { ClaimOutcome } from "@/lib/referrals";
import { useHaptics } from "@/lib/use-haptics";
import { AlsoRows } from "@/screens/paywall/also-rows";
import { SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const PRO_ROWS = ["autolog", "currencies", "installments", "sync"] as const;
const TILE_WASH = 0.15;

export function InviteClaim() {
    const { code } = useLocalSearchParams<{ code?: string }>();
    const normalized = normalizeReferralCode(code ?? "");
    return normalized === null ? <DeadInvite /> : <Invite code={normalized} />;
}

function useLeave() {
    const router = useRouter();
    return () => (router.canGoBack() ? router.back() : router.replace("/"));
}

function Layout({ children, footer }: { children: ReactNode; footer: ReactNode }) {
    const insets = useSafeAreaInsets();
    return (
        <View className="bg-background flex-1" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <ScrollView contentContainerClassName="px-5" contentContainerStyle={{ paddingTop: insets.top + 56 }}>
                {children}
            </ScrollView>
            <View className="gap-1 px-5 pt-3">{footer}</View>
        </View>
    );
}

function DeadInvite() {
    const t = useTranslation();
    const leave = useLeave();
    return (
        <Layout
            footer={
                <Button className="rounded-full" fullWidth onPress={leave} variant="primary">
                    {t("common.done")}
                </Button>
            }
        >
            <Text accessibilityRole="header" className="text-foreground font-sans-bold text-[34px] leading-[41px]">
                {t("referrals.claim.unknown")}
            </Text>
        </Layout>
    );
}

function Invite({ code }: { code: string }) {
    const t = useTranslation();
    const colors = useColors();
    const inviter = useAtomValue(inviterAtom(code));
    const known = AsyncResult.isSuccess(inviter) ? inviter.value : undefined;
    if (known === null) {
        return <DeadInvite />;
    }
    const name = known?.name ?? null;
    return (
        <Layout footer={<ClaimActions code={code} name={name} />}>
            <Text accessibilityRole="header" className="text-foreground font-sans-bold text-[34px] leading-[41px]">
                {name ? t("referrals.claim.title", { name }) : t("referrals.claim.titleFriend")}
            </Text>
            <View className="border-foreground border-b-border mt-5 flex-row items-center gap-3 border-t border-b py-3">
                <View
                    className="size-9 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: withAlpha(colors.income, TILE_WASH) }}
                >
                    <HugeiconsIcon color={colors.income} icon={GiftIcon} size={20} strokeWidth={1.9} />
                </View>
                <View className="flex-1">
                    <Text className="text-foreground text-body font-sans-semibold">
                        {name ? t("referrals.claim.from", { name }) : t("referrals.claim.fromFriend")}
                    </Text>
                    <Text className="text-muted text-subtitle font-mono">{formatReferralCode(code)}</Text>
                </View>
                <Text className="text-income text-caption font-mono">{t("referrals.claim.month")}</Text>
            </View>
            <AlsoRows rows={PRO_ROWS} />
        </Layout>
    );
}

function ClaimActions({ code, name }: { code: string; name: string | null }) {
    const t = useTranslation();
    const router = useRouter();
    const leave = useLeave();
    const haptics = useHaptics();
    const { accountId } = useAuthSession();
    const [claiming, setClaiming] = useState(false);
    const [refusal, setRefusal] = useState<Exclude<ClaimOutcome, "claimed"> | null>(null);
    const busy = useLongWait(claiming);
    const claim = useAtomAction(
        claimInviteCommand,
        {
            onSettled: () => setClaiming(false),
            onSuccess: (outcome) => {
                if (outcome === "claimed") {
                    haptics("success");
                    announceClaim(outcome);
                    leave();
                    return;
                }
                haptics("error");
                setRefusal(outcome);
            },
        },
        SILENT
    );
    const signedIn = accountId !== null;
    useFocusEffect(() => {
        if (!signedIn) {
            cancelPendingClaim();
        }
    });

    return (
        <>
            <InlineFailure message={refusal === null ? null : t(REFUSAL_COPY[refusal])} />
            <View className="gap-1 pb-3">
                <Text className="text-muted text-subtitle text-center">
                    {signedIn ? t("referrals.claim.startsNow") : t("referrals.claim.startsAtSignIn")}
                </Text>
                <Text className="text-muted text-caption text-center">
                    {name
                        ? t("referrals.claim.shared", { days: REFERRAL_DAYS_TO_EARN, name })
                        : t("referrals.claim.sharedFriend", { days: REFERRAL_DAYS_TO_EARN })}
                </Text>
            </View>
            <StepCta
                busy={busy}
                busyLabel={t("referrals.claim.claiming")}
                disabled={claiming}
                label={signedIn ? t("referrals.claim.claim") : t("referrals.claim.signIn")}
                onPress={() => {
                    if (!signedIn) {
                        claimOnceSignedIn(code);
                        router.push("/settings/account");
                        return;
                    }
                    setRefusal(null);
                    setClaiming(true);
                    claim(code);
                }}
            />
            <Button
                className="rounded-full"
                fullWidth
                onPress={() => {
                    cancelPendingClaim();
                    leave();
                }}
                variant="ghost"
            >
                {t("referrals.claim.notNow")}
            </Button>
        </>
    );
}
