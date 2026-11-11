import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Alert } from "panelui-web/alert";
import { Avatar } from "panelui-web/avatar";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import { useToast } from "panelui-web/toast";
import { useSyncExternalStore } from "react";
import { useIntlayer, useLocale } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { useProfile } from "@/lib/account-state";
import { useLedgerBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { INITIAL_SYNC, readSync, subscribeSync } from "@/lib/sync-status";

import { Row, SectionHead, SettingsCard } from "./parts";
import { Stat } from "./usage";

const MINUTE_MS = 60_000;
const subscribeMinute = (notify: () => void) => {
    const timer = setInterval(notify, MINUTE_MS);
    return () => clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
const serverMinute = () => 0;
const serverSync = () => INITIAL_SYNC;

const pad = (value: number) => String(value).padStart(2, "0");

export function Sync() {
    const copy = useIntlayer("dashboard-sync");
    const { sections } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const { clockTime } = useDisplayFormat();
    const committer = useLedgerCommitter();
    const user = useProfile();
    const toast = useToast();
    const { transactions } = useLedgerBooks();
    const { lastSyncedAt, peak, status, waiting } = useSyncExternalStore(subscribeSync, readSync, serverSync);
    const now = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
    const syncedAt = status === "upToDate" ? Math.max(now, lastSyncedAt ?? 0) : lastSyncedAt;

    const sendNow = () => {
        committer.resume();
        if (status === "upToDate") {
            toast.add({ title: copy.sent.value });
        }
    };

    const syncedStat = () => {
        if (syncedAt === null) {
            return { note: copy.thisSession, value: copy.notYet };
        }
        const at = new Date(syncedAt);
        const time = clockTime(`${pad(at.getHours())}:${pad(at.getMinutes())}`);
        const sameDay = at.toDateString() === new Date(now).toDateString();
        const date = at.toLocaleDateString(locale, { day: "numeric", month: "short" });
        return sameDay
            ? { note: at.toLocaleDateString(locale, { day: "numeric", month: "short", weekday: "short" }), value: time }
            : { note: time, value: date };
    };
    const synced = syncedStat();
    const statusView = {
        failed: { badge: copy.failed, title: copy.notSyncing, variant: "destructive" },
        syncing: { badge: copy.inProgress, title: copy.syncing, variant: "warning" },
        upToDate: { badge: copy.on, title: copy.upToDate, variant: "success" },
    } as const;
    const { badge, title, variant } = statusView[status];
    const showProgress = status === "syncing" && peak > 0;

    return (
        <>
            <SectionHead
                action={
                    status === "failed" ? null : (
                        <Button disabled={status === "syncing"} onClick={sendNow} variant="outline">
                            <HugeiconsIcon icon={ReloadIcon} size={16} />
                            {copy.syncNow}
                        </Button>
                    )
                }
                title={sections.sync}
            />
            <div className="@container flex flex-col gap-4 pb-8">
                <Kpi.Group className="max-sm:flex-col max-sm:gap-y-5 max-sm:divide-x-0 max-sm:*:px-0" surface>
                    <Stat
                        label={copy.status}
                        note={
                            <Badge dot variant={variant}>
                                {badge}
                            </Badge>
                        }
                        value={<span className="font-sans">{title}</span>}
                    />
                    <Stat
                        label={copy.waiting}
                        note={showProgress ? copy.ofChanges({ count: peak }) : copy.changes}
                        value={waiting}
                    />
                    <Stat label={copy.lastSynced} note={synced.note} value={synced.value} />
                    <Stat label={copy.inLedger} note={copy.transactions} value={transactions.length} />
                </Kpi.Group>
                <div className="grid items-start gap-4 @4xl:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-4">
                        {status === "failed" ? (
                            <Alert tone="destructive">
                                <Alert.Icon />
                                <Alert.Title>{copy.unreachable}</Alert.Title>
                                <Alert.Description>{copy.completeHere}</Alert.Description>
                                <Alert.Actions>
                                    <Button onClick={sendNow} size="sm" variant="outline">
                                        <HugeiconsIcon icon={ReloadIcon} size={16} />
                                        {copy.retry}
                                    </Button>
                                </Alert.Actions>
                            </Alert>
                        ) : null}
                        <SettingsCard
                            action={
                                showProgress ? (
                                    <span className="dash-figure text-muted-foreground text-[13px]">
                                        {copy.progress({ done: peak - waiting, total: peak })}
                                    </span>
                                ) : null
                            }
                            title={copy.replication}
                        >
                            {showProgress ? (
                                <div className="border-b px-4 py-4">
                                    <span className="bg-app-fill block h-1.5 overflow-hidden rounded-full">
                                        <span
                                            className="bg-primary block h-full rounded-full"
                                            style={{ width: `${((peak - waiting) / peak) * 100}%` }}
                                        />
                                    </span>
                                </div>
                            ) : null}
                            <Skeleton loading={user === undefined}>
                                <Row
                                    hint={<span className="ph-no-capture">{user?.email}</span>}
                                    label={<span className="ph-no-capture">{user?.name}</span>}
                                    leading={<Avatar name={user?.name ?? ""} size="sm" />}
                                >
                                    <Button render={<Link to="/app/settings/account" />} size="sm" variant="outline">
                                        {copy.account}
                                    </Button>
                                </Row>
                            </Skeleton>
                        </SettingsCard>
                    </div>
                </div>
            </div>
        </>
    );
}
