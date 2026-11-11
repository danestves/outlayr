import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Share01Icon from "@hugeicons/core-free-icons/Share01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RedeemStatus, ReferralOverview } from "@outlayr/backend/confect/referrals.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import {
    normalizeReferralCode,
    REFERRAL_DAYS_TO_EARN,
    REFERRAL_YEARLY_CAP,
    referralLink,
} from "@outlayr/money/contract";
import { earnedThisYear, monthsEarned, rewardsToAnnounce } from "@outlayr/money/referrals";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert } from "panelui-web/alert";
import { Avatar } from "panelui-web/avatar";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Kpi } from "panelui-web/kpi";
import { Table } from "panelui-web/table";
import { useToast } from "panelui-web/toast";
import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { referralsQuery } from "@/lib/account-state";
import { convexClient } from "@/lib/convex";

import { Row, SectionHead, SettingsCard } from "./parts";
import { Stat } from "./usage";

type Friend = ReferralOverview["friends"][number];
type Refusal = Exclude<RedeemStatus, "claimed" | "signedOut"> | "offline";

const SEEN_KEY = "outlayr-referral-reward-seen";

const readSeen = () => {
    try {
        return Number(localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {
        return 0;
    }
};

const writeSeen = (seenAt: number) => {
    try {
        localStorage.setItem(SEEN_KEY, String(seenAt));
    } catch {
        // Blocked storage only means the note can show again next visit.
    }
};

function useShareInvite(code: string | null) {
    const copy = useIntlayer("dashboard-invite");
    const toast = useToast();
    const { locale } = useLocale();
    return async () => {
        if (code === null) {
            return;
        }
        const link = `https://${referralLink(code, locale)}`;
        const text = copy.shareMessage({ code, link }).value;
        if (navigator.canShare?.({ text })) {
            await navigator.share({ text }).catch(() => undefined);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };
}

function CopyRow({ label, mono }: { label: ReactNode; mono: string }) {
    const copy = useIntlayer("dashboard-invite");
    const toast = useToast();
    const write = async () => {
        try {
            await navigator.clipboard.writeText(mono);
            toast.add({ title: copy.copied.value });
        } catch {
            toast.add({ title: copy.copyFailed.value, type: "destructive" });
        }
    };
    return (
        <Row
            hint={<span className="text-foreground font-mono text-[13px] break-all select-all">{mono}</span>}
            label={<span className="text-muted-foreground font-normal">{label}</span>}
        >
            <Button onClick={write} size="sm" variant="outline">
                <HugeiconsIcon icon={Copy01Icon} size={16} />
                {copy.copy}
            </Button>
        </Row>
    );
}

function ClaimBody({
    code,
    name,
    onClose,
    onRefused,
}: {
    code: string;
    name: string | null;
    onClose: () => void;
    onRefused: (reason: Refusal) => void;
}) {
    const copy = useIntlayer("dashboard-invite");
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const claim = async () => {
        setBusy(true);
        const status = await convexClient()
            .action(api.referrals.redeem, { code })
            .catch(() => "offline" as const);
        setBusy(false);
        if (status === "claimed") {
            toast.add({ title: copy.claim.claimed.value });
            onClose();
            return;
        }
        onRefused(status === "signedOut" ? "offline" : status);
    };
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>{name ? copy.claim.title({ name }) : copy.claim.titleFriend}</Dialog.Title>
                <Dialog.Description>{copy.claim.startsNow}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
                <p className="text-muted-foreground text-sm leading-5">
                    {name
                        ? copy.claim.shared({ days: REFERRAL_DAYS_TO_EARN, name })
                        : copy.claim.sharedFriend({ days: REFERRAL_DAYS_TO_EARN })}
                </p>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close render={<Button variant="secondary" />}>{copy.claim.notNow}</Dialog.Close>
                <Button loading={busy} onClick={claim}>
                    {copy.claim.confirm}
                </Button>
            </Dialog.Footer>
        </>
    );
}

function ClaimDialog({
    claim,
    onClose,
    onRefused,
    open,
}: {
    claim: { code: string; name: string | null } | null;
    onClose: () => void;
    onRefused: (reason: Refusal) => void;
    open: boolean;
}) {
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell">
                {claim ? (
                    <ClaimBody code={claim.code} name={claim.name} onClose={onClose} onRefused={onRefused} />
                ) : null}
            </Dialog.Content>
        </Dialog>
    );
}

function EnterCode() {
    const copy = useIntlayer("dashboard-invite");
    const formId = useId();
    const [typed, setTyped] = useState("");
    const [problem, setProblem] = useState<ReactNode>(null);
    const [busy, setBusy] = useState(false);
    const [claim, setClaim] = useState<{ code: string; name: string | null } | null>(null);
    const [claiming, setClaiming] = useState(false);
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const code = normalizeReferralCode(typed);
        if (code === null) {
            setProblem(copy.wrongCode);
            return;
        }
        setBusy(true);
        setProblem(null);
        try {
            const inviter = await convexClient().query(api.referrals.inviter, { code });
            if (inviter === null) {
                setProblem(copy.refusal.invalid);
            } else {
                setClaim({ code, name: inviter.name });
                setClaiming(true);
            }
        } catch {
            setProblem(copy.refusal.offline);
        } finally {
            setBusy(false);
        }
    };
    return (
        <SettingsCard title={copy.enter}>
            <form className="p-4" id={formId} onSubmit={submit}>
                <Field invalid={problem !== null}>
                    <Field.Label>{copy.codeLabel}</Field.Label>
                    <div className="flex items-center gap-2">
                        <Input
                            autoCapitalize="characters"
                            autoComplete="off"
                            className="min-w-0 flex-1 font-mono"
                            onChange={(event) => {
                                setTyped(event.target.value);
                                setProblem(null);
                            }}
                            placeholder={copy.codePlaceholder.value}
                            spellCheck={false}
                            value={typed}
                        />
                        <Button loading={busy} size="sm" type="submit" variant="outline">
                            {copy.apply}
                        </Button>
                    </div>
                    {problem ? <Field.Error match>{problem}</Field.Error> : null}
                </Field>
            </form>
            <ClaimDialog
                claim={claim}
                onClose={() => {
                    setClaiming(false);
                    setTyped("");
                }}
                onRefused={(reason) => {
                    setClaiming(false);
                    setProblem(copy.refusal[reason]);
                }}
                open={claiming}
            />
        </SettingsCard>
    );
}

function FriendsCard({
    friends,
    loading,
    now,
    onShare,
}: {
    friends: readonly Friend[];
    loading: boolean;
    now: number;
    onShare: () => void;
}) {
    const copy = useIntlayer("dashboard-invite");
    const { locale } = useLocale();
    const thisYear = new Date(now).getFullYear();
    const rewardDate = (at: number) =>
        new Date(at).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: new Date(at).getFullYear() === thisYear ? undefined : "numeric",
        });
    const ordered = friends.toSorted((a, b) => (b.rewardedAt ?? 0) - (a.rewardedAt ?? 0));
    const count = friends.length;
    return (
        <SettingsCard
            action={count ? <span className="dash-figure text-muted-foreground text-[13px]">{count}</span> : null}
            title={copy.friends}
        >
            {count === 0 ? (
                <Skeleton loading={loading}>
                    <div aria-hidden className="divide-y">
                        {["head", "row"].map((row) => (
                            <div className="flex items-center justify-between gap-3 px-4 py-3" key={row}>
                                <span className="flex w-1/3 items-center gap-2">
                                    {row === "row" ? (
                                        <span className="border-border size-[26px] rounded-lg border" />
                                    ) : null}
                                    <span className="border-border h-2 w-16 rounded-full border" />
                                </span>
                                <span className="border-border h-2 w-16 rounded-full border" />
                                <span className="border-border h-2 w-12 rounded-full border" />
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center px-5 pt-6 pb-8 text-center">
                        <b className="text-sm font-semibold">{copy.emptyTitle}</b>
                        <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                            {copy.emptyBody({ days: REFERRAL_DAYS_TO_EARN })}
                        </p>
                        <Button className="mt-4" onClick={onShare}>
                            <HugeiconsIcon icon={Share01Icon} size={16} />
                            {copy.share}
                        </Button>
                    </div>
                </Skeleton>
            ) : (
                <Table aria-label={copy.friends.value} framed maxHeight="none">
                    <Table.Header className="in-data-[sticky]:bg-card">
                        <Table.Row>
                            <Table.Head>{copy.name}</Table.Head>
                            <Table.Head>{copy.progress}</Table.Head>
                            <Table.Head />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {ordered.map((friend) => {
                            const name = friend.name ?? copy.unnamed.value;
                            return (
                                <Table.Row key={friend.id}>
                                    <Table.Cell>
                                        <span className="flex items-center gap-2.5 font-medium">
                                            <Avatar name={name} size="sm" />
                                            <span className="max-w-[120px] truncate">{name}</span>
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell className="text-muted-foreground">
                                        {friend.rewardedAt === null
                                            ? copy.logged({ days: friend.daysLogged, total: REFERRAL_DAYS_TO_EARN })
                                            : copy.done({
                                                  date: rewardDate(friend.rewardedAt),
                                                  days: Math.max(friend.daysLogged, REFERRAL_DAYS_TO_EARN),
                                              })}
                                    </Table.Cell>
                                    <Table.Cell align="end">
                                        <Badge dot variant={friend.status === "rewarded" ? "success" : "outline"}>
                                            {copy.status[friend.status]}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            )}
        </SettingsCard>
    );
}

function LandedLine({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <div className="border-border flex items-center justify-between gap-4 border-t py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="dash-figure font-medium">{value}</span>
        </div>
    );
}

function RewardLanded({ onShare, overview }: { onShare: () => void; overview: ReferralOverview }) {
    const copy = useIntlayer("dashboard-invite");
    const { unnamed } = copy;
    const { usage } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const [seenAt, setSeenAt] = useState(readSeen);
    const [now] = useState(() => Date.now());
    const fresh = rewardsToAnnounce(overview.friends, seenAt, now);
    const latest = Math.max(0, ...fresh.map((friend) => friend.rewardedAt ?? 0));
    const [shown, setShown] = useState<{ at: number; friends: readonly Friend[] }>({ at: 0, friends: [] });
    if (latest > shown.at) {
        setShown({ at: latest, friends: fresh });
    }
    const dismiss = () => {
        writeSeen(shown.at);
        setSeenAt(shown.at);
    };
    const count = shown.friends.length;
    const [first] = shown.friends;
    const until = overview.promoEndsAt;
    const banked = overview.bankedMonths > 0 || until === null;
    return (
        <Dialog onOpenChange={(open) => open || dismiss()} open={shown.at > seenAt}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>
                        {count === 1 && first
                            ? copy.landed.who({ days: REFERRAL_DAYS_TO_EARN, name: first.name ?? unnamed.value })
                            : copy.landed.whoMany({ count, days: REFERRAL_DAYS_TO_EARN })}
                    </Dialog.Title>
                    <Dialog.Description>
                        {count === 1 ? copy.landed.earnedOne : copy.landed.earnedMany({ count })}
                    </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                    <LandedLine
                        label={banked ? copy.landed.starts : copy.landed.until}
                        value={
                            banked || until === null
                                ? copy.landed.after
                                : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(until)
                        }
                    />
                    <LandedLine
                        label={copy.landed.fromFriends}
                        value={
                            <>
                                {earnedThisYear(overview.friends, now)}{" "}
                                {usage.ofCapacity({ count: REFERRAL_YEARLY_CAP })}
                            </>
                        }
                    />
                </Dialog.Body>
                <Dialog.Footer>
                    <Dialog.Close render={<Button variant="secondary" />}>{copy.landed.done}</Dialog.Close>
                    <Button
                        onClick={() => {
                            dismiss();
                            onShare();
                        }}
                    >
                        {copy.landed.another}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

export function Invite() {
    const copy = useIntlayer("dashboard-invite");
    const { sections, usage } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const query = useQuery(referralsQuery);
    const overview = query.data ?? null;
    const { data: minted, mutate: mint } = useMutation({
        mutationFn: () => convexClient().mutation(api.referrals.ensureCode, {}),
    });
    const unminted = overview !== null && overview.code === null;
    // oxlint-disable-next-line outlayr/react-effect-budget -- Convex is an external system.
    useEffect(() => {
        if (unminted) {
            mint();
        }
    }, [mint, unminted]);
    const code = overview?.code ?? minted ?? null;
    const [now] = useState(() => Date.now());
    const share = useShareInvite(code);
    const friends = overview?.friends ?? [];
    const loading = overview === null;

    if (query.isError) {
        return (
            <>
                <SectionHead title={sections.invite} />
                <Alert tone="destructive" variant="plain">
                    <Alert.Title>{copy.loadFailed}</Alert.Title>
                    <Button onClick={() => query.refetch()} size="sm" variant="outline">
                        {copy.retry}
                    </Button>
                </Alert>
            </>
        );
    }

    const earned = earnedThisYear(friends, now);
    const logging = friends.filter((friend) => friend.status === "counting").length;
    const shownCode = code ?? "········";
    return (
        <>
            <SectionHead
                action={
                    <Button disabled={code === null} onClick={share}>
                        <HugeiconsIcon icon={Share01Icon} size={16} />
                        {copy.share}
                    </Button>
                }
                title={sections.invite}
            />
            <div className="flex flex-col gap-4">
                <Skeleton loading={loading}>
                    <Kpi.Group
                        className="rounded-2xl max-sm:flex-col max-sm:gap-y-5 max-sm:divide-x-0 max-sm:*:px-0"
                        surface
                    >
                        <Stat label={copy.monthsEarned} note={copy.lifetime} value={monthsEarned(friends)} />
                        <Stat
                            label={copy.yearlyLimit}
                            note={
                                <span className="bg-app-fill mt-1.5 block h-1 overflow-hidden rounded-full">
                                    <span
                                        className="bg-primary block h-full rounded-full"
                                        style={{ width: `${Math.min(100, (earned / REFERRAL_YEARLY_CAP) * 100)}%` }}
                                    />
                                </span>
                            }
                            unit={usage.ofCapacity({ count: REFERRAL_YEARLY_CAP })}
                            value={earned}
                        />
                        <Stat
                            label={copy.friends}
                            note={friends.length === 0 ? copy.noneYet : copy.stillLogging({ count: logging })}
                            value={friends.length}
                        />
                    </Kpi.Group>
                </Skeleton>
                <div className="grid items-start gap-4 @4xl:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-4">
                        <SettingsCard
                            footer={
                                <span className="text-muted-foreground text-[13px]">
                                    {copy.footnote({ cap: REFERRAL_YEARLY_CAP, days: REFERRAL_DAYS_TO_EARN })}
                                </span>
                            }
                            title={copy.headline}
                        >
                            <Skeleton loading={code === null}>
                                <CopyRow label={copy.yourLink} mono={`https://${referralLink(shownCode, locale)}`} />
                                <CopyRow label={copy.yourCode} mono={shownCode} />
                            </Skeleton>
                        </SettingsCard>
                        {overview?.canRedeem ? <EnterCode /> : null}
                    </div>
                    <FriendsCard friends={friends} loading={loading} now={now} onShare={share} />
                </div>
            </div>
            {overview ? <RewardLanded onShare={share} overview={overview} /> : null}
        </>
    );
}
