import { useAtomValue } from "@effect/atom-react/Hooks";
import Share01Icon from "@hugeicons-pro/core-stroke-rounded/Share01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
    formatReferralCode,
    normalizeReferralCode,
    REFERRAL_DAYS_TO_EARN,
    REFERRAL_YEARLY_CAP,
    referralLink,
} from "@outlayr/money/contract";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Input } from "panelui-native/components/input";
import { useState } from "react";
import { Share, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { InlineFailure } from "@/components/form/inline-failure";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { formatSentenceDate } from "@/domain/dates";
import { monthsEarned } from "@/domain/referrals";
import type { ReferredFriend } from "@/domain/referrals";
import { useReferralOverview } from "@/hooks/use-referral-overview";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { inviteCodeAtom } from "@/lib/referrals";
import { useColors } from "@/theme/use-colors";

export function InviteFriends() {
    const { accountId } = useAuthSession();
    return accountId === null ? <SettingsScreen>{null}</SettingsScreen> : <InviteView accountId={accountId} />;
}

function InviteView({ accountId }: { accountId: string }) {
    const t = useTranslation();
    const overview = useReferralOverview();
    const ensured = useAtomValue(inviteCodeAtom(accountId));
    const code = overview?.code ?? (AsyncResult.isSuccess(ensured) ? ensured.value : null);
    const friends = overview?.friends ?? [];
    const earned = monthsEarned(friends);

    return (
        <SettingsScreen>
            <Text accessibilityRole="header" className="text-foreground font-sans-bold pt-4 text-[26px] leading-8">
                {t("referrals.headline")}
            </Text>
            <CodeBlock code={code} />
            {friends.length > 0 ? (
                <SettingsSection
                    accessory={
                        earned > 0 ? (
                            <Text className="text-muted text-subtitle">{t("referrals.earned", { count: earned })}</Text>
                        ) : undefined
                    }
                    title={t("referrals.friends")}
                >
                    {friends.map((friend) => (
                        <FriendRow friend={friend} key={friend.id} />
                    ))}
                </SettingsSection>
            ) : null}
            <Text className="text-muted text-subtitle pt-3">
                {t("referrals.footnote", { cap: REFERRAL_YEARLY_CAP, days: REFERRAL_DAYS_TO_EARN })}
            </Text>
            {overview?.canRedeem ? <EnterCode /> : null}
        </SettingsScreen>
    );
}

function CodeBlock({ code }: { code: string | null }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const shown = code === null ? null : formatReferralCode(code);
    const link = code === null ? null : referralLink(code, language);
    return (
        <>
            <View className="border-border mt-5 border-b pb-4">
                <Text
                    accessibilityLabel={shown === null ? undefined : t("referrals.code.a11y", { code: shown })}
                    className={cn(
                        "font-mono-medium text-[34px] leading-10 tracking-[4px]",
                        code === null ? "text-muted" : "text-foreground"
                    )}
                    selectable={code !== null}
                >
                    {shown ?? "···· ····"}
                </Text>
                <Text className="text-muted text-subtitle pt-0.5" selectable={link !== null}>
                    {link ?? " "}
                </Text>
            </View>
            <Button
                className="mt-5 rounded-full"
                disabled={code === null}
                fullWidth
                onPress={() => {
                    if (shown !== null && link !== null) {
                        void Share.share({
                            message: t("referrals.share.message", { code: shown, link: `https://${link}` }),
                        });
                    }
                }}
                size="lg"
                startContent={<HugeiconsIcon color={colors.primaryForeground} icon={Share01Icon} size={20} />}
                variant="primary"
            >
                {t("referrals.share")}
            </Button>
        </>
    );
}

function FriendRow({ friend }: { friend: ReferredFriend }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const name = friend.name ?? t("referrals.friend.unnamed");
    const caption =
        friend.rewardedAt === null
            ? t("referrals.friend.logged", { days: friend.daysLogged, total: REFERRAL_DAYS_TO_EARN })
            : t("referrals.friend.done", {
                  date: formatSentenceDate(new Date(friend.rewardedAt), language),
                  days: REFERRAL_DAYS_TO_EARN,
              });
    const trailing = {
        capped: t("referrals.friend.capped"),
        counting: t("referrals.friend.pending"),
        lifetime: t("referrals.friend.lifetime"),
        rewarded: t("referrals.friend.month"),
    }[friend.status];
    return (
        <Animated.View
            accessibilityLabel={`${name}. ${caption}. ${trailing}`}
            accessible
            className="border-border flex-row items-center gap-3 border-b py-3"
            entering={FadeIn}
            layout={LinearTransition}
        >
            <View className="bg-surface-secondary size-9 items-center justify-center rounded-[10px]">
                <Text className="text-foreground font-sans-semibold text-callout">{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
                <Text className="text-foreground text-body font-sans-semibold">{name}</Text>
                <Text className="text-muted text-subtitle">{caption}</Text>
            </View>
            <Text
                className={
                    friend.status === "rewarded"
                        ? "text-income text-caption font-mono"
                        : "text-muted text-caption font-mono"
                }
            >
                {trailing}
            </Text>
        </Animated.View>
    );
}

function EnterCode() {
    const t = useTranslation();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState("");
    const [wrong, setWrong] = useState(false);

    if (!open) {
        return (
            <Text
                accessibilityRole="button"
                className="text-tint text-subtitle font-sans-semibold pt-6"
                onPress={() => setOpen(true)}
            >
                {t("referrals.code.enter")}
            </Text>
        );
    }

    const go = () => {
        const code = normalizeReferralCode(typed);
        setWrong(code === null);
        if (code !== null) {
            router.push(`/i/${code}`);
        }
    };

    return (
        <Animated.View className="gap-3 pt-6" entering={FadeIn}>
            <Input
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                onChangeText={setTyped}
                onSubmitEditing={go}
                placeholder={t("referrals.code.placeholder")}
                returnKeyType="go"
                value={typed}
            />
            <InlineFailure message={wrong ? t("referrals.code.wrong") : null} />
            <Button className="rounded-full" disabled={typed.trim() === ""} fullWidth onPress={go} variant="outline">
                {t("common.continue")}
            </Button>
        </Animated.View>
    );
}
