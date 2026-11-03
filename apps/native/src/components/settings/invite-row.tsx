import type { ReferralOverview } from "@outlayr/backend/confect/referrals.spec";
import { REFERRAL_DAYS_TO_EARN, REFERRAL_YEARLY_CAP } from "@outlayr/money/contract";
import { eq } from "drizzle-orm";
import { useIsFocused, useRouter } from "expo-router";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { LinkRow } from "@/components/list/list-row";
import { Text } from "@/components/text";
import { useSheetInsets } from "@/components/use-sheet-insets";
import { useDatabase } from "@/contexts/local-data-context";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { appMeta } from "@/db/schema";
import { formatSentenceDate } from "@/domain/dates";
import { earnedThisYear, rewardsToAnnounce } from "@/domain/referrals";
import type { ReferredFriend } from "@/domain/referrals";
import { useReferralOverview } from "@/hooks/use-referral-overview";
import { useTickingNow } from "@/hooks/use-usage-limits";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { markRewardsSeenCommand } from "@/lib/referrals";
import { SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

export function InviteFriendsRow() {
    const { accountId } = useAuthSession();
    return accountId === null ? null : <SignedInInvite />;
}

function SignedInInvite() {
    const router = useRouter();
    const t = useTranslation();
    const overview = useReferralOverview();
    if (overview?.earns === false) {
        return null;
    }
    return (
        <>
            <LinkRow
                icon="Gift"
                onPress={() => router.push("/settings/invite")}
                title={t("referrals.title")}
                value={t("referrals.row.value")}
            />
            {overview ? <RewardLanded overview={overview} /> : null}
        </>
    );
}

function useRewardSeenAt(): number {
    const db = useDatabase();
    return useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.referralRewardSeen)),
        (rows) => Number(rows[0]?.value ?? 0)
    );
}

function RewardLanded({ overview }: { overview: ReferralOverview }) {
    const db = useDatabase();
    const seenAt = useRewardSeenAt();
    const focused = useIsFocused();
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const markSeen = useAtomAction(markRewardsSeenCommand, {}, SILENT);
    const now = useTickingNow(false);
    const fresh = rewardsToAnnounce(overview.friends, seenAt, now);
    const latest = Math.max(0, ...fresh.map((friend) => friend.rewardedAt ?? 0));
    const [shown, setShown] = useState<{ at: number; friends: readonly ReferredFriend[] }>({ at: 0, friends: [] });
    if (latest > shown.at) {
        setShown({ at: latest, friends: fresh });
    }
    const open = shown.at > seenAt && focused && lockOpen && !covered;
    const dismiss = () => markSeen({ db, seenAt: shown.at });

    return <LandedSheet friends={shown.friends} onDismiss={dismiss} open={open} overview={overview} />;
}

function LandedSheet({
    friends,
    onDismiss,
    open,
    overview,
}: {
    friends: readonly ReferredFriend[];
    onDismiss: () => void;
    open: boolean;
    overview: ReferralOverview;
}) {
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const now = useTickingNow(false);
    const count = friends.length;
    const [first] = friends;
    const who =
        count === 1 && first
            ? t("referrals.landed.who", {
                  days: REFERRAL_DAYS_TO_EARN,
                  name: first.name ?? t("referrals.friend.unnamed"),
              })
            : t("referrals.landed.whoMany", { count, days: REFERRAL_DAYS_TO_EARN });
    const until = overview.promoEndsAt;
    const banked = overview.bankedMonths > 0 || until === null;

    return (
        <BottomSheet
            native
            nativeBackground={colors.background}
            onOpenChange={(next) => {
                if (!next && open) {
                    onDismiss();
                }
            }}
            open={open}
        >
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <View accessible className="items-center">
                        <View className="flex-row items-baseline gap-2">
                            <Text className="text-income font-sans text-[64px] leading-[68px] tracking-tight">{`+${count}`}</Text>
                            <Text className="text-muted font-sans text-[24px] leading-[30px]">
                                {count === 1 ? t("referrals.landed.month") : t("referrals.landed.months")}
                            </Text>
                        </View>
                        <Text className="text-muted text-subtitle pt-1">{who}</Text>
                    </View>
                    <View className="border-foreground mt-5 border-t">
                        <Line
                            label={banked ? t("referrals.landed.starts") : t("referrals.landed.until")}
                            value={
                                banked || until === null
                                    ? t("referrals.landed.after")
                                    : formatSentenceDate(new Date(until), language)
                            }
                        />
                        <Line label={t("referrals.landed.renews")} value={t("common.never")} />
                        <Line
                            label={t("referrals.landed.fromFriends")}
                            value={t("referrals.landed.ofCap", {
                                cap: REFERRAL_YEARLY_CAP,
                                count: earnedThisYear(overview.friends, now),
                            })}
                        />
                    </View>
                    <Button className="mt-6 rounded-full" fullWidth onPress={onDismiss} variant="primary">
                        {t("common.done")}
                    </Button>
                    <Button
                        className="mt-2 rounded-full"
                        fullWidth
                        onPress={() => {
                            onDismiss();
                            router.push("/settings/invite");
                        }}
                        variant="ghost"
                    >
                        {t("referrals.landed.another")}
                    </Button>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return (
        <View className="border-border flex-row items-center justify-between border-b py-3">
            <Text className="text-foreground text-body">{label}</Text>
            <Text className="text-foreground text-subtitle font-mono">{value}</Text>
        </View>
    );
}
