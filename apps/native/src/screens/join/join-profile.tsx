import { useAtomValue } from "@effect/atom-react/Hooks";
import DoorOpenIcon from "@hugeicons-pro/core-stroke-rounded/DoorOpenIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import UserMultipleIcon from "@hugeicons-pro/core-stroke-rounded/UserMultipleIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ClaimStatus } from "@outlayr/backend/confect/profileSharing.spec";
import { normalizeReferralCode } from "@outlayr/money/contract";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useState } from "react";
import type { ComponentProps } from "react";
import { ScrollView, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { MemberAvatar } from "@/components/member-avatar";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { PROFILE_SEAT_LIMIT } from "@/domain/profile-sharing";
import { useLongWait } from "@/hooks/use-long-wait";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { useWhen } from "@/lib/lifecycle";
import { cancelProfileJoin, profileInviteAtom, requestProfileJoin } from "@/lib/profile-sharing";
import { SILENT } from "@/state/atom-command";
import { joinProfileCommand } from "@/state/joined-profiles-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

type JoinErrorKind = "expired" | "full" | "generic" | "invalid" | "lapsed" | "own";

type IconGlyph = ComponentProps<typeof HugeiconsIcon>["icon"];

interface InviteLook {
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    name: string;
}

const TILE_SIZE = 64;
const ERROR_TILE_SIZE = 48;
const RULE_HEIGHT = 52;

export function JoinProfile() {
    const { code } = useLocalSearchParams<{ code?: string }>();
    const normalized = normalizeReferralCode(code ?? "");
    return normalized === null ? (
        <JoinErrorScreen kind="invalid" look={null} ownerName={null} />
    ) : (
        <JoinFlow code={normalized} />
    );
}

function JoinFlow({ code }: { code: string }) {
    const invite = useAtomValue(profileInviteAtom(code));
    const known = AsyncResult.isSuccess(invite) ? invite.value : undefined;
    const slow = useLongWait(known === undefined && !AsyncResult.isFailure(invite));
    if (AsyncResult.isFailure(invite)) {
        return <JoinErrorScreen kind="generic" look={null} ownerName={null} />;
    }
    if (known === undefined) {
        return <JoinLoading slow={slow} />;
    }
    if (known === null) {
        return <JoinErrorScreen kind="invalid" look={null} ownerName={null} />;
    }
    switch (known.state) {
        case "open": {
            return <JoinSheet code={code} look={known.look} ownerName={known.ownerName} />;
        }
        case "member": {
            return <AutoMemberJoin code={code} />;
        }
        case "expired": {
            return <JoinErrorScreen kind="expired" look={known.look} ownerName={known.ownerName} />;
        }
        case "full": {
            return <JoinErrorScreen kind="full" look={known.look} ownerName={known.ownerName} />;
        }
        case "own": {
            return <JoinErrorScreen kind="own" look={known.look} ownerName={known.ownerName} />;
        }
        default: {
            return <JoinErrorScreen kind="invalid" look={known.look} ownerName={known.ownerName} />;
        }
    }
}

function refusalKind(status: Exclude<ClaimStatus, "joined">): JoinErrorKind {
    switch (status) {
        case "claimed":
        case "invalid": {
            return "invalid";
        }
        case "expired": {
            return "expired";
        }
        case "full": {
            return "full";
        }
        case "own": {
            return "own";
        }
        case "ownerLapsed": {
            return "lapsed";
        }
        default: {
            return "generic";
        }
    }
}

function useLeaveSheet() {
    const router = useRouter();
    return () => (router.canGoBack() ? router.back() : router.replace("/"));
}

function useJoin(code: string, onRefusal: (kind: JoinErrorKind) => void) {
    return useAtomAction(
        joinProfileCommand,
        {
            onFailure: () => onRefusal("generic"),
            onSuccess: (status) => {
                if (status !== "joined") {
                    onRefusal(refusalKind(status));
                }
            },
        },
        SILENT
    );
}

function JoinLoading({ slow }: { slow: boolean }) {
    const t = useTranslation();
    const colors = useColors();
    if (!slow) {
        return null;
    }
    return (
        <View className="bg-background flex-1 items-center justify-center px-5">
            <BusyText className="text-muted text-subtitle" color={colors.muted}>
                {t("sharing.join.loading")}
            </BusyText>
        </View>
    );
}

function InvitedLine({ name }: { name: string | null }) {
    const t = useTranslation();
    if (name === null) {
        return <Text className="text-muted text-body flex-1">{t("sharing.join.invitedUnknown")}</Text>;
    }
    const [before, after] = t("sharing.join.invited").split("{name}");
    return (
        <Text className="text-body flex-1" numberOfLines={1}>
            <Text className="text-muted">{before}</Text>
            <Text className="text-foreground font-sans-semibold">{name}</Text>
            <Text className="text-muted">{after}</Text>
        </Text>
    );
}

function JoinSheet({ code, look, ownerName }: { code: string; look: InviteLook | null; ownerName: string | null }) {
    const t = useTranslation();
    const router = useRouter();
    const db = useDatabase();
    const colors = useColors();
    const { accountId } = useAuthSession();
    const leave = useLeaveSheet();
    const [joining, setJoining] = useState(false);
    const [refusal, setRefusal] = useState<JoinErrorKind | null>(null);
    const slow = useLongWait(joining);
    const join = useJoin(code, (kind) => {
        setJoining(false);
        setRefusal(kind);
    });

    if (refusal !== null) {
        return <JoinErrorScreen kind={refusal} look={look} ownerName={ownerName} />;
    }

    return (
        <View className="bg-background flex-1" collapsable={false}>
            {/* react-native-screens resizes a ScrollView on a formSheet's first-child chain to the whole sheet. */}
            <View collapsable={false} />
            <ScrollView contentContainerClassName="px-5 pt-3 pb-4" contentInsetAdjustmentBehavior="automatic">
                <View className="flex-row items-center gap-3">
                    <MemberAvatar id={ownerName ?? "inviter"} name={ownerName ?? "?"} size={40} />
                    <InvitedLine name={ownerName} />
                </View>
                <View className="flex-row items-center gap-4 pt-6">
                    <ProfileTile look={look} size={TILE_SIZE} />
                    <Text
                        accessibilityRole="header"
                        className="text-foreground font-sans-bold flex-1 text-[30px] leading-[36px]"
                    >
                        {look?.name ?? ""}
                    </Text>
                </View>
                <View className="border-border mt-6 border-t">
                    <Rule icon={PlusSignIcon} label={t("sharing.join.add")} />
                    <Rule icon={UserMultipleIcon} label={t("sharing.join.see")} />
                    <Rule icon={DoorOpenIcon} label={t("sharing.join.leave")} />
                </View>
                <View className="flex-row gap-2.5 pt-5">
                    <Button
                        className="flex-1 rounded-full"
                        onPress={() => {
                            cancelProfileJoin();
                            leave();
                        }}
                        variant="secondary"
                    >
                        {t("sharing.join.notNow")}
                    </Button>
                    <Button
                        className="flex-1 rounded-full"
                        disabled={joining}
                        onPress={() => {
                            if (accountId === null) {
                                requestProfileJoin(code);
                                router.push("/settings/account");
                                return;
                            }
                            setJoining(true);
                            join({ accountId, code, from: db });
                        }}
                        variant="primary"
                    >
                        {joining && slow ? (
                            <BusyText className="text-body" color={colors.primaryForeground}>
                                {t("sharing.join.joining")}
                            </BusyText>
                        ) : (
                            t("sharing.join.action")
                        )}
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

function Rule({ icon, label }: { icon: IconGlyph; label: string }) {
    const colors = useColors();
    return (
        <View className="border-border flex-row items-center gap-3 border-b" style={{ minHeight: RULE_HEIGHT }}>
            <HugeiconsIcon color={colors.muted} icon={icon} size={22} strokeWidth={1.8} />
            <Text className="text-foreground text-callout">{label}</Text>
        </View>
    );
}

function AutoMemberJoin({ code }: { code: string }) {
    const t = useTranslation();
    const db = useDatabase();
    const { accountId } = useAuthSession();
    const [refusal, setRefusal] = useState<JoinErrorKind | null>(null);
    const join = useJoin(code, (kind) => setRefusal(kind));
    useWhen(accountId !== null, () => {
        if (accountId !== null) {
            join({ accountId, code, from: db });
        }
    });

    if (refusal !== null) {
        return <JoinErrorScreen kind={refusal} look={null} ownerName={null} />;
    }

    return (
        <View className="bg-background flex-1 items-center justify-center gap-3 px-5">
            <ProfileTile look={null} size={ERROR_TILE_SIZE} />
            <Text className="text-muted text-subtitle">{t("sharing.join.joining")}</Text>
        </View>
    );
}

function errorCopy(
    t: ReturnType<typeof useTranslation>,
    kind: JoinErrorKind,
    name: string | null,
    ownerName: string | null
) {
    switch (kind) {
        case "expired": {
            return {
                body:
                    ownerName === null
                        ? t("sharing.error.expired.bodyUnknown")
                        : t("sharing.error.expired.body", { name: ownerName }),
                title: t("sharing.error.expired.title"),
            };
        }
        case "full": {
            return {
                body:
                    ownerName === null
                        ? t("sharing.error.full.bodyUnknown", { limit: PROFILE_SEAT_LIMIT })
                        : t("sharing.error.full.body", { limit: PROFILE_SEAT_LIMIT, name: ownerName }),
                title: name === null ? t("sharing.error.full.titleUnknown") : t("sharing.error.full.title", { name }),
            };
        }
        case "lapsed": {
            return {
                body:
                    ownerName === null
                        ? t("sharing.error.lapsed.bodyUnknown")
                        : t("sharing.error.lapsed.body", { name: ownerName }),
                title:
                    name === null ? t("sharing.error.lapsed.titleUnknown") : t("sharing.error.lapsed.title", { name }),
            };
        }
        case "own": {
            return { body: t("sharing.error.own.body"), title: t("sharing.error.own.title") };
        }
        case "invalid": {
            return { body: t("sharing.error.invalid.body"), title: t("sharing.error.invalid.title") };
        }
        default: {
            return { body: t("sharing.error.generic.body"), title: t("sharing.error.generic.title") };
        }
    }
}

function JoinErrorScreen({
    kind,
    look,
    ownerName,
}: {
    kind: JoinErrorKind;
    look: InviteLook | null;
    ownerName: string | null;
}) {
    const t = useTranslation();
    const leave = useLeaveSheet();
    const copy = errorCopy(t, kind, look?.name ?? null, ownerName);

    return (
        <View className="bg-background flex-1" collapsable={false}>
            <View collapsable={false} />
            <ScrollView contentContainerClassName="px-5 pt-3 pb-4" contentInsetAdjustmentBehavior="automatic">
                <View style={{ opacity: 0.55 }}>
                    <ProfileTile look={look} size={ERROR_TILE_SIZE} />
                </View>
                <Text
                    accessibilityRole="header"
                    className="text-foreground font-sans-bold pt-5 text-[22px] leading-[28px]"
                >
                    {copy.title}
                </Text>
                <Text className="text-muted text-body pt-2 leading-[21px]">{copy.body}</Text>
                <Button className="mt-6 rounded-full" fullWidth onPress={leave} variant="secondary">
                    {t("sharing.error.close")}
                </Button>
            </ScrollView>
        </View>
    );
}

function ProfileTile({ look, size }: { look: InviteLook | null; size: number }) {
    const colors = useColors();
    const color = look?.imageColor ?? look?.customColor ?? colors.tint;
    return (
        <View
            style={{
                alignItems: "center",
                backgroundColor: withAlpha(color, 0.15),
                borderRadius: 20,
                height: size,
                justifyContent: "center",
                width: size,
            }}
        >
            {look?.emoji ? (
                <Text maxFontSizeMultiplier={1} style={{ fontSize: size * 0.48 }}>
                    {look.emoji}
                </Text>
            ) : (
                <HugeiconsIcon color={color} icon={UserMultipleIcon} size={size * 0.42} strokeWidth={1.8} />
            )}
        </View>
    );
}
