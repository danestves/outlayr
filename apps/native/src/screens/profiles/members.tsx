import DoorOpenIcon from "@hugeicons-pro/core-stroke-rounded/DoorOpenIcon";
import Link01Icon from "@hugeicons-pro/core-stroke-rounded/Link01Icon";
import UserMultipleIcon from "@hugeicons-pro/core-stroke-rounded/UserMultipleIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import { Stack } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Clipboard, Pressable, ScrollView, Share, View } from "react-native";

import { CloseToolbar } from "@/components/close-toolbar";
import { MemberAvatar } from "@/components/member-avatar";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useProfiles } from "@/data/profiles";
import { PROFILE_SEAT_LIMIT, profileInviteLink } from "@/domain/profile-sharing";
import { useProfileMembers } from "@/hooks/use-profile-sharing";
import { useTranslation } from "@/i18n/context";
import { activeProfileId } from "@/lib/active-profile";
import { useAuthSession } from "@/lib/auth-session";
import { useJoinedProfiles } from "@/lib/joined-profiles";
import { useMirror, useTimers } from "@/lib/lifecycle";
import type { ProfileMember, ProfileMembersView } from "@/lib/profile-sharing";
import { SILENT } from "@/state/atom-command";
import {
    createProfileInviteCommand,
    leaveProfileCommand,
    ProfileSharingError,
    removeProfileMemberCommand,
} from "@/state/joined-profiles-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const ROW_HEIGHT = 56;
const COPIED_MS = 2000;
const PROFILE_TILE = 72;

interface ProfileLook {
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
    name: string;
}

export function ProfileMembersScreen() {
    const id = activeProfileId();
    return id === undefined ? null : <MembersOfProfile id={id} />;
}

function MembersOfProfile({ id }: { id: string }) {
    const t = useTranslation();
    const joined = useJoinedProfiles();
    const owned = useProfiles().find((profile) => profile.id === id);
    const look = joined.find((profile) => profile.profileId === id)?.look ?? null;
    const members = useProfileMembers(id);
    const role = members?.role ?? (look === null ? "owner" : "member");
    const name = look?.name ?? owned?.name ?? "";
    const title = role === "owner" ? t("sharing.share.title", { name }) : t("sharing.profile.title");

    return (
        <View className="bg-background flex-1">
            <Stack.Screen options={{ title }} />
            <CloseToolbar placement="right" />
            {role === "owner" ? (
                <OwnerView id={id} members={members} name={name} />
            ) : (
                <MemberView id={id} look={look} members={members} name={name} />
            )}
        </View>
    );
}

function seatCount(members: ProfileMembersView | null | undefined): number {
    return (members?.members ?? []).filter((member) => !member.owner).length;
}

function SectionHeader({ count }: { count: number }) {
    const t = useTranslation();
    return (
        <View className="flex-row items-baseline justify-between pt-6 pb-2">
            <Text className="text-foreground text-title font-sans-semibold">{t("sharing.members.title")}</Text>
            <Text className="text-muted text-subtitle font-mono">
                {t("sharing.members.count", { count, limit: PROFILE_SEAT_LIMIT })}
            </Text>
        </View>
    );
}

function OwnerView({
    id,
    members,
    name,
}: {
    id: string;
    members: ProfileMembersView | null | undefined;
    name: string;
}) {
    const t = useTranslation();
    const colors = useColors();
    const timers = useTimers();
    const { accountId } = useAuthSession();
    const people = members?.members ?? [];
    const count = seatCount(members);
    const [copied, setCopied] = useState(false);
    const [inviteFailed, setInviteFailed] = useState(false);
    const [issued, setIssued] = useState<{ code: string; expiresAt: number } | null>(null);
    const createInvite = useAtomAction(createProfileInviteCommand, {
        onFailure: () => setInviteFailed(true),
        onSuccess: (next) => {
            setInviteFailed(false);
            setIssued(next);
        },
    });
    const owner = members?.role === "owner";
    const full = count >= PROFILE_SEAT_LIMIT;
    // The server reuses a live invite or mints one, so asking on open and after every seat change keeps the link
    // valid without trusting this phone's clock or a cached query that never reruns as time passes.
    useMirror([owner, full, count], () => {
        if (owner && !full) {
            createInvite({ profileId: id });
        }
        return undefined;
    });
    const invite = full ? null : issued;
    const link = invite === null ? "" : profileInviteLink(invite.code);

    return (
        <ScrollView contentContainerClassName="px-5 pb-8" contentInsetAdjustmentBehavior="automatic">
            {full ? (
                <Text className="text-muted text-subtitle pt-5">
                    {t("sharing.seatsFull", { limit: PROFILE_SEAT_LIMIT })}
                </Text>
            ) : (
                <>
                    <View className="border-border flex-row items-center gap-2 border-y" style={{ minHeight: 52 }}>
                        <HugeiconsIcon color={colors.muted} icon={Link01Icon} size={18} strokeWidth={1.8} />
                        <Text className="text-muted text-caption shrink font-mono" numberOfLines={1}>
                            {link}
                        </Text>
                        <View className="flex-1" />
                        <Text
                            accessibilityRole="button"
                            className="text-tint text-subtitle font-sans-semibold"
                            onPress={() => {
                                if (invite === null) {
                                    return;
                                }
                                Clipboard.setString(link);
                                setCopied(true);
                                timers.after(COPIED_MS, () => setCopied(false));
                            }}
                        >
                            {copied ? t("sharing.copied") : t("sharing.copy")}
                        </Text>
                    </View>
                    {inviteFailed ? (
                        <Text className="text-muted text-footnote pt-2">{t("sharing.invite.failed")}</Text>
                    ) : null}
                    <Button
                        className="mt-5 rounded-full"
                        disabled={invite === null}
                        fullWidth
                        onPress={() => {
                            if (invite !== null) {
                                void Share.share({ message: t("sharing.share.message", { link, name }) });
                            }
                        }}
                        size="lg"
                        variant="primary"
                    >
                        {t("sharing.shareLink")}
                    </Button>
                </>
            )}
            <SectionHeader count={count} />
            <View className="border-border border-t">
                <Row>
                    <MemberAvatar id={accountId ?? "owner"} name={t("sharing.members.you")} size={40} />
                    <Names label={t("sharing.members.you")} note={t("sharing.members.owner")} />
                </Row>
                {people
                    .filter((member) => !member.owner)
                    .map((member) => (
                        <MemberRow id={id} key={member.id} member={member} />
                    ))}
            </View>
        </ScrollView>
    );
}

function Row({ children }: { children: ReactNode }) {
    return (
        <View className="border-border flex-row items-center gap-3 border-b" style={{ minHeight: ROW_HEIGHT }}>
            {children}
        </View>
    );
}

function Names({ label, note }: { label: string; note?: string }) {
    return (
        <View className="flex-1">
            <Text className="text-foreground text-body font-sans-semibold" numberOfLines={1}>
                {label}
            </Text>
            {note === undefined ? null : <Text className="text-muted text-footnote">{note}</Text>}
        </View>
    );
}

function MemberRow({ id, member }: { id: string; member: ProfileMember }) {
    const t = useTranslation();
    const remove = useAtomAction(removeProfileMemberCommand, {
        onFailure: () => Alert.alert(t("sharing.remove.failed.title"), t("sharing.remove.failed.body")),
    });
    const name = member.name ?? t("sharing.member.unknown");
    const confirm = () =>
        Alert.alert(t("sharing.remove.title", { name }), t("sharing.remove.body"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => remove({ memberId: member.id, profileId: id }),
                style: "destructive",
                text: t("sharing.remove.action"),
            },
        ]);

    return (
        <Row>
            <MemberAvatar id={member.id} name={name} size={40} />
            <Text className="text-foreground text-body font-sans-semibold flex-1" numberOfLines={1}>
                {name}
            </Text>
            <Pressable
                accessibilityLabel={t("sharing.remove.title", { name })}
                accessibilityRole="button"
                hitSlop={8}
                onPress={confirm}
            >
                <Text className="text-danger text-subtitle font-sans-semibold">{t("sharing.remove")}</Text>
            </Pressable>
        </Row>
    );
}

function MemberView({
    id,
    look,
    members,
    name,
}: {
    id: string;
    look: ProfileLook | null;
    members: ProfileMembersView | null | undefined;
    name: string;
}) {
    const t = useTranslation();
    const db = useDatabase();
    const colors = useColors();
    const { accountId } = useAuthSession();
    const people = members?.members ?? [];
    const owner = people.find((member) => member.owner);
    const me = people.find((member) => member.id === accountId);
    const rest = people.filter((member) => !member.owner && member.id !== accountId);
    const leave = useAtomAction(
        leaveProfileCommand,
        {
            onFailure: (cause) => {
                const error = Cause.squash(cause);
                if (error instanceof ProfileSharingError && error.reason === "unsynced") {
                    Alert.alert(t("sharing.leave.unsynced.title"), t("sharing.leave.unsynced.body"));
                    return;
                }
                Alert.alert(t("sharing.leave.failed.title"), t("sharing.leave.failed.body"));
            },
        },
        SILENT
    );
    const confirm = () =>
        Alert.alert(t("sharing.leave.title", { name }), t("sharing.leave.body"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => leave({ from: db, id }),
                style: "destructive",
                text: t("sharing.leave.action"),
            },
        ]);

    return (
        <ScrollView contentContainerClassName="px-5 pb-8" contentInsetAdjustmentBehavior="automatic">
            <View className="items-center pt-4">
                <ProfileLookTile look={look} size={PROFILE_TILE} />
                <Text
                    accessibilityRole="header"
                    className="text-foreground font-sans-bold pt-4 text-[22px] leading-[28px]"
                >
                    {name}
                </Text>
            </View>
            <SectionHeader count={seatCount(members)} />
            <View className="border-border border-t">
                {owner ? <Person member={owner} /> : null}
                {me ? <Person label={t("sharing.members.you")} member={me} /> : null}
                {rest.map((member) => (
                    <Person key={member.id} member={member} />
                ))}
            </View>
            <Pressable
                accessibilityRole="button"
                className="border-border mt-8 flex-row items-center gap-3 border-b pl-1"
                onPress={confirm}
                style={{ minHeight: ROW_HEIGHT }}
            >
                <HugeiconsIcon color={colors.danger} icon={DoorOpenIcon} size={22} strokeWidth={1.8} />
                <Text className="text-danger text-body font-sans-semibold">{t("sharing.leave")}</Text>
            </Pressable>
        </ScrollView>
    );
}

function Person({ label, member }: { label?: string; member: ProfileMember }) {
    const t = useTranslation();
    const name = member.name ?? t("sharing.member.unknown");
    return (
        <Row>
            <MemberAvatar id={member.id} name={name} size={40} />
            <Names label={label ?? name} note={member.owner ? t("sharing.members.owner") : undefined} />
        </Row>
    );
}

function ProfileLookTile({ look, size }: { look: ProfileLook | null; size: number }) {
    const colors = useColors();
    const color = look?.imageColor ?? look?.customColor ?? colors.tint;
    return (
        <View
            style={{
                alignItems: "center",
                backgroundColor: withAlpha(color, 0.15),
                borderRadius: 24,
                height: size,
                justifyContent: "center",
                width: size,
            }}
        >
            {look?.emoji ? (
                <Text maxFontSizeMultiplier={1} style={{ fontSize: size * 0.46 }}>
                    {look.emoji}
                </Text>
            ) : (
                <HugeiconsIcon color={color} icon={UserMultipleIcon} size={size * 0.4} strokeWidth={1.8} />
            )}
        </View>
    );
}
