import { formatWait, projectLimit } from "@outlayr/money/limit-projection";
import { earnedThisYear } from "@outlayr/money/referrals";
import { useQuery } from "@tanstack/react-query";
import { Kpi } from "panelui-web/kpi";
import { Table } from "panelui-web/table";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { limitsQuery, referralsQuery } from "@/lib/account-state";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";

import { SectionHead, SettingsCard } from "./parts";

const MONTHS_A_YEAR = 12;
const DAY_MS = 86_400_000;
const FREE = { accounts: 3, autoLog: 30, budgets: 2, currencies: 1, installmentApps: 2, payoffPlans: 2, people: 3 };
const SAMPLE_BUCKET = { capacity: 1, kind: "token bucket", period: 1, rate: 1, ts: 0, value: 1 } as const;
const SAMPLE_LIMITS = {
    captures: SAMPLE_BUCKET,
    csvImport: SAMPLE_BUCKET,
    enrichment: SAMPLE_BUCKET,
    pro: true,
    receiptScan: SAMPLE_BUCKET,
    voiceEntry: SAMPLE_BUCKET,
};

// PanelUI meters drag or live in a popover; the bars in this table are static.
export function Stat({
    label,
    note,
    unit,
    value,
}: {
    label: ReactNode;
    note: ReactNode;
    unit?: ReactNode;
    value: ReactNode;
}) {
    return (
        <Kpi>
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value className="dash-figure text-2xl leading-8 font-semibold tracking-[-0.04em]">
                {value}
                {unit ? (
                    <span className="text-muted-foreground ml-1.5 text-sm font-medium tracking-normal">{unit}</span>
                ) : null}
            </Kpi.Value>
            <p className="text-muted-foreground text-[13px] leading-5">{note}</p>
        </Kpi>
    );
}

const MINUTE_MS = 60_000;

const subscribeMinute = (notify: () => void) => {
    const timer = setInterval(notify, MINUTE_MS);
    return () => clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
const serverMinute = () => 0;

export function Usage() {
    const copy = useIntlayer("dashboard-settings");
    const { usage: text } = copy;
    const { locale } = useLocale();
    const { data } = useQuery(limitsQuery);
    const { data: referrals, isPending: countingFriends } = useQuery(referralsQuery);
    const now = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
    const limits = data ?? SAMPLE_LIMITS;
    const captures = projectLimit(limits.captures, now);
    const months = earnedThisYear(referrals?.friends ?? [], now);
    const buckets = [
        { bucket: limits.receiptScan, label: text.receipts },
        { bucket: limits.voiceEntry, label: text.voice },
        { bucket: limits.enrichment, label: text.suggestions },
        ...(limits.csvImport ? [{ bucket: limits.csvImport, label: text.imports }] : []),
    ];
    const value = (free: number) => (limits.pro ? text.unlimited : String(free));
    const rows: readonly [ReactNode, ReactNode][] = [
        [text.accounts, value(FREE.accounts)],
        [text.budgets, value(FREE.budgets)],
        [text.currencies, limits.pro ? text.everyOne : String(FREE.currencies)],
        [text.people, value(FREE.people)],
        [text.installmentApps, value(FREE.installmentApps)],
        [text.payoffPlans, value(FREE.payoffPlans)],
        [text.autoLogMonth, value(FREE.autoLog)],
        [text.capturesMonth, String(captures.capacity)],
        [text.syncBackup, limits.pro ? text.yes : text.no],
    ];
    const resetDay = new Intl.DateTimeFormat(LANGUAGES[localeFromParam(locale)].date, {
        day: "numeric",
        month: "short",
    });
    return (
        <>
            <SectionHead title={copy.sections.usage} />
            <Skeleton loading={!data || countingFriends}>
                <div className="flex flex-col gap-4">
                    <Kpi.Group className="rounded-2xl max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-5" surface>
                        <Stat
                            label={text.capturesLeft}
                            note={text.capturesKinds}
                            unit={text.ofCapacity({ count: captures.capacity })}
                            value={captures.left}
                        />
                        <Stat
                            label={text.resets}
                            note={
                                captures.fullAt === null
                                    ? null
                                    : text.inDays({ count: Math.ceil((captures.fullAt - now) / DAY_MS) })
                            }
                            value={captures.fullAt === null ? text.full : resetDay.format(captures.fullAt)}
                        />
                        <Stat
                            label={text.autoLog}
                            note={limits.pro ? text.pro : text.free}
                            value={limits.pro ? text.unlimited : FREE.autoLog}
                        />
                        <Stat
                            label={text.friends}
                            note={text.thisYear}
                            unit={text.ofCapacity({ count: MONTHS_A_YEAR })}
                            value={months}
                        />
                    </Kpi.Group>
                    <div className="grid items-start gap-4 @4xl:grid-cols-2">
                        <SettingsCard title={text.thisHour}>
                            <Table framed aria-label={text.thisHour.value} maxHeight="none">
                                <Table.Header className="in-data-[sticky]:bg-card">
                                    <Table.Row>
                                        <Table.Head>{text.feature}</Table.Head>
                                        <Table.Head>{text.left}</Table.Head>
                                        <Table.Head align="end">{text.fullIn}</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {buckets.map(({ bucket, label }) => {
                                        const projection = projectLimit(bucket, now);
                                        return (
                                            <Table.Row key={label.value}>
                                                <Table.Cell className="font-medium whitespace-nowrap">
                                                    {label}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <span className="flex items-center gap-3">
                                                        <span className="dash-figure whitespace-nowrap">
                                                            {projection.left} / {projection.capacity}
                                                        </span>
                                                        <span className="bg-app-fill h-1 w-24 overflow-hidden rounded-full max-sm:hidden">
                                                            <span
                                                                className="bg-primary block h-full rounded-full"
                                                                style={{
                                                                    width: `${(projection.left / projection.capacity) * 100}%`,
                                                                }}
                                                            />
                                                        </span>
                                                    </span>
                                                </Table.Cell>
                                                <Table.Cell align="end" className="dash-figure text-muted-foreground">
                                                    {projection.fullAt === null
                                                        ? text.full
                                                        : formatWait(projection.fullAt - now)}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table>
                        </SettingsCard>
                        <SettingsCard title={text.yourLimits}>
                            <Table framed aria-label={text.yourLimits.value} maxHeight="none">
                                <Table.Header className="in-data-[sticky]:bg-card">
                                    <Table.Row>
                                        <Table.Head>{text.limit}</Table.Head>
                                        <Table.Head align="end">{limits.pro ? text.pro : text.free}</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {rows.map(([label, cell], index) => (
                                        <Table.Row key={index}>
                                            <Table.Cell className="font-medium">{label}</Table.Cell>
                                            <Table.Cell align="end" className="dash-figure">
                                                {cell}
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        </SettingsCard>
                    </div>
                </div>
            </Skeleton>
        </>
    );
}
