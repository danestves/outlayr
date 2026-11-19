import Settings01Icon from "@hugeicons/core-free-icons/Settings01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useToast } from "panelui-web/toast";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { OrderTile } from "@/components/dashboard/installments/parts";
import { useSeedName } from "@/components/dashboard/recurring/data";
import { ScheduleTile, useChargeMoney, useDay } from "@/components/dashboard/recurring/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useDisplayFormat, useMeta, writeSettings } from "@/lib/ledger-settings";
import { RECURRING_KEY, recurringBookOf, recurringModel } from "@/lib/recurring";

import { SEEN_KEY, feedOf, isUnread, noticesOf } from "./notices";
import type { Feed, Notice } from "./notices";

interface Notices {
    /** Null until the full ledger lands: a light one cannot see charges missed further back. */
    feed: Feed | null;
    markSeen: () => void;
}

const NoticesContext = createContext<Notices>({ feed: null, markSeen: () => undefined });

export const useNotices = () => useContext(NoticesContext);

export function NoticesProvider({ children }: { children: ReactNode }) {
    const { ledger } = useDashboard();
    const meta = useMeta();
    const nameOf = useSeedName();
    const db = useLedgerDb();
    const toast = useToast();
    const failed = useIntlayer("dashboard-shell").notifications.seenFailed.value;
    const rawBook = meta.get(RECURRING_KEY);
    const rawSeen = meta.get(SEEN_KEY);
    const book = useMemo(() => recurringBookOf(rawBook), [rawBook]);
    const feed = useMemo((): Feed | null => {
        if (ledger.opening !== null) {
            return null;
        }
        return feedOf(noticesOf(ledger, recurringModel(ledger, book, nameOf)), rawSeen);
    }, [book, ledger, nameOf, rawSeen]);
    const unread = feed?.unread ?? 0;
    const markSeen = useCallback(() => {
        if (unread === 0) {
            return;
        }
        writeSettings(db, { [SEEN_KEY]: String(Date.now()) }).catch(() =>
            toast.add({ title: failed, type: "destructive" })
        );
    }, [db, failed, toast, unread]);
    const value = useMemo(() => ({ feed, markSeen }), [feed, markSeen]);
    return <NoticesContext value={value}>{children}</NoticesContext>;
}

export function UnreadChip({ count }: { count: number }) {
    if (count === 0) {
        return null;
    }
    return (
        <span className="bg-app-tint/15 text-app-tint text-app-micro rounded-app-xs px-1.5 font-mono leading-5 font-medium">
            {count}
        </span>
    );
}

export function UnreadDot() {
    return <span className="bg-app-tint ring-app-bg absolute top-0 right-0 size-2 rounded-full ring-2" aria-hidden />;
}

function NoticeRow({ notice, onNavigate, unread }: { notice: Notice; onNavigate: () => void; unread: boolean }) {
    const { ledger } = useDashboard();
    const { notifications } = useIntlayer("dashboard-shell");
    const charge = useChargeMoney();
    const { money } = useDisplayFormat();
    const { day } = useDay();
    const today = notice.day === ledger.today;
    const when = today ? notifications.today.value : day(notice.day, ledger.today);
    const body = (
        <>
            {unread ? <span className="bg-app-tint absolute top-5 left-1.5 size-1.5 rounded-full" /> : null}
            {/* Both tiles paint the fill the panel itself sits on, so they take the rule colour here. */}
            <span className="flex shrink-0 [--color-app-fill:var(--color-app-rule)] [--color-muted:var(--color-app-rule)]">
                {notice.kind === "recurring" ? (
                    <ScheduleTile name={notice.schedule.name} seed={notice.schedule.seed} />
                ) : (
                    <OrderTile look={notice.plan.look} />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <b className="text-app-body block truncate font-medium">
                    {notice.kind === "recurring"
                        ? (today ? notifications.dueToday : notifications.overdue)({ name: notice.schedule.name })
                        : (today ? notifications.installmentDueToday : notifications.installmentOverdue)({
                              name: notice.plan.name,
                          })}
                </b>
                <span className="text-app-label text-muted-foreground block font-mono">
                    {notice.kind === "recurring"
                        ? charge.plain(notice.schedule.worth)
                        : money(notice.amount, notice.plan.currency)}
                </span>
            </span>
            <span className="text-app-caption text-muted-foreground shrink-0 font-mono">{when}</span>
        </>
    );
    const row = "hover:bg-app-hover relative flex items-start gap-2.5 px-4 py-2.5";
    return notice.kind === "recurring" ? (
        <Link className={row} onClick={onNavigate} to="/recurring">
            {body}
        </Link>
    ) : (
        <Link className={row} onClick={onNavigate} params={{ planId: notice.plan.id }} to="/installments/$planId">
            {body}
        </Link>
    );
}

function Loading() {
    const { notifications } = useIntlayer("dashboard-shell");
    return (
        <output aria-label={notifications.loading.value} className="flex flex-col py-2">
            {[0, 1, 2].map((bone) => (
                <span className="flex items-center gap-2.5 px-4 py-2.5" key={bone}>
                    <span className="bg-app-group rounded-app-sm size-6.5 shrink-0" />
                    <span className="flex flex-1 flex-col gap-1.5">
                        <span className="bg-app-group rounded-app-xs h-3.5 w-3/5" />
                        <span className="bg-app-group rounded-app-xs h-3 w-1/4" />
                    </span>
                </span>
            ))}
        </output>
    );
}

function Empty({ onNavigate }: { onNavigate: () => void }) {
    const { notifications } = useIntlayer("dashboard-shell");
    return (
        <div className="flex flex-col items-start gap-1 px-4 py-6">
            <b className="text-app-body font-medium">{notifications.emptyTitle}</b>
            <p className="text-app-label text-muted-foreground">{notifications.emptyBody}</p>
            <Button
                className="mt-3"
                onClick={onNavigate}
                render={<Link search={{ tab: "upcoming" }} to="/recurring" />}
                size="sm"
                variant="outline"
            >
                {notifications.seeComing}
            </Button>
        </div>
    );
}

/** `seenAt` is the read mark as it stood when the panel opened, so rows keep their dots while it stays open. */
export function NoticeList({ onNavigate, seenAt }: { onNavigate: () => void; seenAt: number | null }) {
    const { ledger } = useDashboard();
    const { feed } = useNotices();
    const { notifications } = useIntlayer("dashboard-shell");
    if (feed === null) {
        return <Loading />;
    }
    if (feed.notices.length === 0) {
        return <Empty onNavigate={onNavigate} />;
    }
    const sections = [
        { label: notifications.today, notices: feed.notices.filter((notice) => notice.day === ledger.today) },
        { label: notifications.earlier, notices: feed.notices.filter((notice) => notice.day !== ledger.today) },
    ].filter((section) => section.notices.length > 0);
    return (
        <div className="flex flex-col pb-2">
            {sections.map((section) => (
                <section className="flex flex-col" key={section.label.value}>
                    <h3 className="text-app-caption text-muted-foreground px-4 pt-2 pb-1">{section.label}</h3>
                    {section.notices.map((notice) => (
                        <NoticeRow
                            key={notice.id}
                            notice={notice}
                            onNavigate={onNavigate}
                            unread={isUnread(notice, seenAt)}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}

export function SettingsLink({ onNavigate }: { onNavigate: () => void }) {
    const { notifications } = useIntlayer("dashboard-shell");
    return (
        <Link
            className="h-app-row border-app-strong text-app-label hover:bg-app-hover flex shrink-0 items-center gap-2 border-t px-4 font-medium"
            onClick={onNavigate}
            to="/settings/notifications"
        >
            <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={2} />
            {notifications.settings}
        </Link>
    );
}
