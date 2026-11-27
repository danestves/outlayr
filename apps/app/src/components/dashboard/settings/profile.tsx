import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import DoorOpenIcon from "@hugeicons/core-free-icons/DoorOpenIcon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useMirror } from "@outlayr/shared/lifecycle";
import { useMatch } from "@tanstack/react-router";
import { Avatar } from "panelui-web/avatar";
import { Button } from "panelui-web/button";
import { useToast } from "panelui-web/toast";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { figureOf, foldFees } from "@/components/dashboard/home/rows";
import { ProfileEditor } from "@/components/dashboard/profile/editor";
import { PERSONAL_LOOK, ProfileTile } from "@/components/dashboard/profile/tile";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { convexClient } from "@/lib/convex";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { authorBucket, authorId, FORMER_AUTHORS, unsentOf } from "@/lib/profile-authors";
import { noteProfileDeleted } from "@/lib/profile-loss";
import { activeProfileOf, profileLook, useLedgerProfiles } from "@/lib/profile-registry";
import type { LedgerProfile, ProfileLook } from "@/lib/profile-registry";
import {
    PROFILE_SEAT_LIMIT,
    joinedLook,
    joinedProfileOf,
    ownerOf,
    profileInviteLink,
    seatCountOf,
    useJoinedProfiles,
    useProfileMembers,
    useProfileSharingEnabled,
} from "@/lib/profile-sharing";
import type { JoinedProfile, ProfileMember, ProfileMembersView } from "@/lib/profile-sharing";
import { removeProfileAndSwitch } from "@/lib/profile-switch";
import { deleteProfile } from "@/lib/profile-writes";

import { Row, SectionHead, SettingsCard } from "./parts";

const formatDay = (locale: string, ms: number) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(ms));

const formatMonth = (locale: string, day: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
        new Date(`${day.slice(0, 7)}-01T00:00:00Z`)
    );

const lookOf = (active: LedgerProfile | null, joined: JoinedProfile | null): ProfileLook => {
    if (active !== null) {
        return profileLook(active);
    }
    if (joined !== null) {
        return joinedLook(joined);
    }
    return PERSONAL_LOOK;
};

const nameOf = (active: LedgerProfile | null, joined: JoinedProfile | null, personal: string) =>
    active?.name ?? joined?.look.name ?? personal;

function InviteCard({
    code,
    expiresAt,
    failed,
    full,
    link,
    onCopy,
    seats,
}: {
    code: string | null;
    expiresAt: number | null;
    failed: boolean;
    full: boolean;
    link: string;
    onCopy: () => void;
    seats: number;
}) {
    const copy = useIntlayer("profile-sharing");
    const { locale } = useLocale();
    if (full) {
        return (
            <SettingsCard title={copy.invite.title}>
                <Row hint={copy.invite.full({ limit: String(PROFILE_SEAT_LIMIT) })} label={copy.invite.title} />
            </SettingsCard>
        );
    }
    const expires = expiresAt === null ? null : copy.invite.expires({ date: formatDay(locale, expiresAt) }).value;
    const left = copy.invite.seatsLeft({ count: String(seats) }).value;
    const shown = link.replace(/^https?:\/\//u, "");
    return (
        <SettingsCard title={copy.invite.title}>
            <Row
                hint={`${expires === null ? "" : `${expires} · `}${left}. ${copy.invite.anyone.value}`}
                label={
                    <span className="flex min-w-0 items-center gap-2">
                        <HugeiconsIcon className="text-muted-foreground" icon={Link01Icon} strokeWidth={2} />
                        <span className="truncate font-mono text-[13px]">{shown || "-"}</span>
                    </span>
                }
            >
                <Button disabled={code === null} onClick={onCopy} size="sm" variant="outline">
                    <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                    {copy.invite.copy}
                </Button>
            </Row>
            {failed ? <Row hint={copy.invite.failed} label={copy.invite.title} /> : null}
        </SettingsCard>
    );
}

function MemberView({ member, onRemove, you }: { member: ProfileMember; onRemove: (() => void) | null; you: boolean }) {
    const copy = useIntlayer("profile-sharing");
    const { locale } = useLocale();
    const name = member.name ?? copy.memberUnknown.value;
    let hint: ReactNode;
    if (member.owner) {
        hint = copy.members.owner.value;
    } else if (member.joinedAt !== null) {
        hint = copy.members.joined({ date: formatDay(locale, member.joinedAt) }).value;
    }
    return (
        <Row hint={hint} label={you ? copy.members.you.value : name} leading={<Avatar name={name} size="sm" />}>
            {onRemove ? (
                <Button onClick={onRemove} size="sm" variant="destructive">
                    {copy.members.remove}
                </Button>
            ) : null}
        </Row>
    );
}

function MonthSplit({ members, viewerId }: { members: ProfileMembersView; viewerId: string | null }) {
    const copy = useIntlayer("profile-sharing");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const { locale } = useLocale();
    const monthKey = ledger.today.slice(0, 7);
    const ownerId = ownerOf(members)?.id ?? null;
    const splits = useMemo(() => {
        const raw = new Map(ledger.books.transactions.map((row) => [row.localId, row]));
        const known = new Set(members.members.map((member) => member.id));
        const totals = new Map<string, { count: number; total: number }>();
        for (const row of foldFees(ledger.rows.filter((each) => each.day.startsWith(monthKey)))) {
            if ("fromId" in row) {
                continue;
            }
            const source = raw.get(row.id);
            const id = authorBucket(
                authorId(source?.createdBy, source ? unsentOf(source) : false, ownerId, viewerId),
                known
            );
            if (id === null) {
                continue;
            }
            const figure = figureOf(ledger, row);
            const current = totals.get(id) ?? { count: 0, total: 0 };
            totals.set(id, {
                count: current.count + 1,
                total: current.total + (row.income ? figure.amount : -figure.amount),
            });
        }
        const former = totals.get(FORMER_AUTHORS);
        return [
            ...members.members.map((member) => ({
                ...member,
                ...(totals.get(member.id) ?? { count: 0, total: 0 }),
            })),
            ...(former
                ? [{ count: former.count, id: FORMER_AUTHORS, name: copy.formerMembers.value, total: former.total }]
                : []),
        ];
    }, [copy.formerMembers.value, ledger, members.members, monthKey, ownerId, viewerId]);
    return (
        <SettingsCard title={copy.month.title({ month: formatMonth(locale, ledger.today) })}>
            {splits.map((split) => {
                const name = split.name ?? copy.memberUnknown.value;
                return (
                    <Row
                        hint={copy.month.entries({ count: split.count })}
                        key={split.id}
                        label={split.id === viewerId ? copy.members.you : name}
                        leading={<Avatar name={name} size="sm" />}
                    >
                        <span className="font-mono font-medium tabular-nums">
                            {money(split.total, ledger.currency, "always")}
                        </span>
                    </Row>
                );
            })}
        </SettingsCard>
    );
}

function DetailsCard({
    active,
    joined,
    name,
    look,
    ownerId,
    viewerId,
    onEdit,
}: {
    active: LedgerProfile | null;
    joined: JoinedProfile | null;
    name: string;
    look: ProfileLook;
    ownerId: string | null;
    viewerId: string | null;
    onEdit: () => void;
}) {
    const copy = useIntlayer("profiles");
    const sharing = useIntlayer("profile-sharing");
    const { ledger } = useDashboard();
    const { locale } = useLocale();
    const owner = joined?.ownerName ?? null;
    const monthKey = ledger.today.slice(0, 7);
    const ownEntries = useMemo(() => {
        if (joined === null || viewerId === null) {
            return 0;
        }
        const raw = new Map(ledger.books.transactions.map((row) => [row.localId, row]));
        return foldFees(ledger.rows.filter((row) => row.day.startsWith(monthKey))).filter((row) => {
            const source = raw.get(row.id);
            return authorId(source?.createdBy, source ? unsentOf(source) : false, ownerId, viewerId) === viewerId;
        }).length;
    }, [joined, ledger, monthKey, ownerId, viewerId]);
    if (active === null && joined === null) {
        return (
            <SettingsCard title={copy.details}>
                <Row
                    hint={copy.personalLocked}
                    label={copy.personal}
                    leading={<ProfileTile look={PERSONAL_LOOK} size="xl" />}
                />
            </SettingsCard>
        );
    }
    return (
        <SettingsCard
            action={
                active === null ? null : (
                    <Button onClick={onEdit} size="sm" variant="outline">
                        {copy.edit}
                    </Button>
                )
            }
            title={copy.details}
        >
            <Row label={name} leading={<ProfileTile look={look} size="xl" />} />
            <Row label={sharing.details.currency} hint={ledger.currency} />
            {active === null ? null : (
                <>
                    <Row label={sharing.details.owner} hint={sharing.details.you} />
                    <Row label={sharing.details.created} hint={formatDay(locale, active.dateCreated)} />
                </>
            )}
            {joined === null ? null : (
                <>
                    <Row label={sharing.details.owner} hint={owner ?? sharing.memberUnknown} />
                    <Row label={sharing.details.logged({ count: ownEntries })} />
                </>
            )}
        </SettingsCard>
    );
}

function SharingSection({
    active,
    enabled,
    members,
    profileId,
    viewerId,
}: {
    active: LedgerProfile | null;
    enabled: boolean;
    members: ProfileMembersView | null | undefined;
    profileId: string | null;
    viewerId: string | null;
}) {
    const copy = useIntlayer("profiles");
    const sharing = useIntlayer("profile-sharing");
    const toast = useToast();
    const [issued, setIssued] = useState<{ code: string; expiresAt: number } | null>(null);
    const [inviteFailed, setInviteFailed] = useState(false);
    const [removing, setRemoving] = useState<ProfileMember | null>(null);
    const [busy, setBusy] = useState(false);
    const issuing = useRef(false);
    const seats = seatCountOf(members);
    const full = seats >= PROFILE_SEAT_LIMIT;
    const liveCode = members?.invite?.code ?? null;
    const invite = !full && issued !== null && issued.code === liveCode ? issued : null;
    const inviteLink = invite === null ? "" : profileInviteLink(invite.code);
    const canInvite = enabled && active !== null && !full;

    const issue = async () => {
        if (active === null || issuing.current) {
            return;
        }
        issuing.current = true;
        try {
            const next = await convexClient().mutation(api.profileSharing.createInvite, {
                look: {
                    customColor: active.customColor,
                    emoji: active.emoji,
                    icon: active.icon,
                    imageColor: active.imageColor,
                    imageKey: active.imageKey,
                    name: active.name,
                },
                profileId: active.id,
            });
            setIssued(next);
            setInviteFailed(false);
        } catch {
            setInviteFailed(true);
        } finally {
            issuing.current = false;
        }
    };

    useMirror([canInvite, seats, liveCode, active], () => {
        if (canInvite && !issuing.current) {
            void issue();
        }
    });

    const copyLink = async () => {
        if (inviteLink === "") {
            return;
        }
        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.add({ title: sharing.invite.copied.value, type: "success" });
        } catch {
            toast.add({ title: sharing.invite.copyFailed.value, type: "destructive" });
        }
    };

    const remove = async () => {
        if (removing === null || profileId === null || busy) {
            return;
        }
        setBusy(true);
        try {
            await convexClient().mutation(api.profileSharing.removeMember, {
                memberId: removing.id,
                profileId,
            });
            setRemoving(null);
        } catch {
            toast.add({ title: sharing.members.removeFailed.value, type: "destructive" });
        } finally {
            setBusy(false);
        }
    };

    const role = members?.role ?? "member";
    const showMembers = profileId !== null && members != null && (enabled || members.role === "member");
    return (
        <>
            {canInvite ? (
                <InviteCard
                    code={invite?.code ?? null}
                    expiresAt={invite?.expiresAt ?? null}
                    failed={inviteFailed}
                    full={false}
                    link={inviteLink}
                    onCopy={() => copyLink().catch(() => undefined)}
                    seats={PROFILE_SEAT_LIMIT - seats}
                />
            ) : null}
            {enabled && active !== null && full ? (
                <InviteCard
                    code={null}
                    expiresAt={null}
                    failed={false}
                    full
                    link=""
                    onCopy={() => undefined}
                    seats={0}
                />
            ) : null}
            {showMembers ? (
                <SettingsCard
                    action={
                        <span className="text-muted-foreground font-mono text-sm">
                            {sharing.members.count({ count: String(seats), limit: String(PROFILE_SEAT_LIMIT) })}
                        </span>
                    }
                    title={sharing.members.title}
                >
                    {members.members.map((member) => (
                        <MemberView
                            key={member.id}
                            member={member}
                            onRemove={role === "owner" && !member.owner ? () => setRemoving(member) : null}
                            you={member.id === viewerId}
                        />
                    ))}
                </SettingsCard>
            ) : null}
            {enabled && members != null && members.members.length > 1 ? (
                <MonthSplit members={members} viewerId={viewerId} />
            ) : null}
            <ConfirmDialog
                action={sharing.members.remove}
                body={sharing.members.removeBody}
                cancel={copy.cancel}
                onAction={() => remove().catch(() => undefined)}
                onOpenChange={(next) => (busy ? undefined : setRemoving(next ? removing : null))}
                open={removing !== null}
                title={sharing.members.removeTitle({ name: removing?.name ?? sharing.memberUnknown.value })}
                tone="destructive"
            />
        </>
    );
}

export function ProfileSettings() {
    const copy = useIntlayer("profiles");
    const sharing = useIntlayer("profile-sharing");
    const toast = useToast();
    const loaded = useMatch({ from: "/_account/_app", select: (match) => match.loaderData, shouldThrow: false });
    const profileId = loaded?.profileId ?? null;
    const viewerId = loaded?.userId ?? null;
    const profiles = useLedgerProfiles();
    const joinedProfiles = useJoinedProfiles();
    const active = activeProfileOf(profiles, profileId);
    const joined = joinedProfileOf(joinedProfiles, profileId);
    const members = useProfileMembers(profileId);
    const enabled = useProfileSharingEnabled();
    const committer = useLedgerCommitter();
    const { ledger } = useDashboard();
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [busy, setBusy] = useState(false);
    const name = nameOf(active, joined, copy.personal.value);
    const look = lookOf(active, joined);
    const memberCount = members?.members.length ?? 1;
    const ownerId = ownerOf(members)?.id ?? viewerId;

    const removeProfile = async () => {
        if (active === null || busy) {
            return;
        }
        setBusy(true);
        try {
            await deleteProfile(active);
        } catch {
            toast.add({ title: copy.deleteFailed.value, type: "destructive" });
            setConfirming(false);
            setBusy(false);
            return;
        }
        noteProfileDeleted(active.id);
        try {
            await removeProfileAndSwitch(active.id);
        } catch {
            toast.add({ title: copy.switchFailed.value, type: "destructive" });
            setConfirming(false);
            setBusy(false);
        }
    };

    const leave = async () => {
        if (profileId === null || busy) {
            return;
        }
        setBusy(true);
        if (!(await committer.flushAll())) {
            toast.add({ title: sharing.leave.unsynced.value, type: "destructive" });
            setLeaving(false);
            setBusy(false);
            return;
        }
        try {
            await convexClient().mutation(api.profileSharing.leave, { profileId });
        } catch {
            toast.add({ title: sharing.leave.failed.value, type: "destructive" });
            setLeaving(false);
            setBusy(false);
            return;
        }
        try {
            await removeProfileAndSwitch(profileId);
        } catch {
            toast.add({ title: copy.switchFailed.value, type: "destructive" });
            setLeaving(false);
            setBusy(false);
        }
    };

    return (
        <>
            <SectionHead title={copy.title} />
            <div className="flex max-w-160 min-w-0 flex-col gap-4">
                <DetailsCard
                    active={active}
                    joined={joined}
                    look={look}
                    name={name}
                    onEdit={() => setEditing(true)}
                    ownerId={ownerId}
                    viewerId={viewerId}
                />
                <SharingSection
                    active={active}
                    enabled={enabled}
                    members={members}
                    profileId={profileId}
                    viewerId={viewerId}
                />
                {active === null ? null : (
                    <SettingsCard title={copy.deleteProfile}>
                        <Row
                            hint={
                                memberCount > 1
                                    ? sharing.deleteSharedBody({ count: String(memberCount) })
                                    : copy.deleteBody
                            }
                            label={copy.deleteProfile}
                        >
                            <Button onClick={() => setConfirming(true)} size="sm" variant="destructive">
                                {copy.delete}
                            </Button>
                        </Row>
                    </SettingsCard>
                )}
                {joined === null ? null : (
                    <SettingsCard title={sharing.leave.label}>
                        <Row hint={sharing.leave.hint} label={sharing.leave.label}>
                            <Button onClick={() => setLeaving(true)} size="sm" variant="destructive">
                                <HugeiconsIcon icon={DoorOpenIcon} strokeWidth={2} />
                                {sharing.leave.action}
                            </Button>
                        </Row>
                    </SettingsCard>
                )}
            </div>

            {active && editing ? (
                <ProfileEditor
                    key={active.id}
                    onClose={() => setEditing(false)}
                    open
                    profiles={profiles}
                    target={active}
                />
            ) : null}

            <ConfirmDialog
                action={copy.delete}
                body={
                    <span className="flex flex-col gap-2">
                        <span>
                            {memberCount > 1
                                ? sharing.deleteSharedBody({ count: String(memberCount) })
                                : copy.deleteBody}
                        </span>
                        <span className="text-app-muted">
                            {copy.entries}: <span className="font-mono tabular-nums">{ledger.rows.length}</span>
                        </span>
                    </span>
                }
                cancel={copy.cancel}
                onAction={() => removeProfile().catch(() => undefined)}
                onOpenChange={(next) => (busy ? undefined : setConfirming(next))}
                open={confirming}
                title={copy.deleteTitle}
                tone="destructive"
            />
            <ConfirmDialog
                action={sharing.leave.action}
                body={sharing.leave.body}
                cancel={copy.cancel}
                onAction={() => leave().catch(() => undefined)}
                onOpenChange={(next) => (busy ? undefined : setLeaving(next))}
                open={leaving}
                title={sharing.leave.title({ name })}
                tone="destructive"
            />
        </>
    );
}
