import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import Undo02Icon from "@hugeicons/core-free-icons/Undo02Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { isoDay } from "@outlayr/money/ledger-zone";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand } from "@/components/dashboard/accounts/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { Card, Line, NOTE, SourceTile } from "./parts";
import { undoable } from "./store";
import type { ImportRecord, ImportSource, ImportStore } from "./store";
import { UndoDialog, useImportAccount } from "./undo";

export const HEAD = "h-10 px-3 text-xs leading-4 font-medium first:ps-4 last:pe-4";
export const CELL = "h-[51px] px-3 py-0 align-middle text-[13px] first:ps-4 last:pe-4";
const FIGURE = "dash-figure text-sm whitespace-nowrap";
const MS_PER_DAY = 86_400_000;
const RECENT_DAYS = 30;

export function useRecordDay() {
    const { locale } = useLocale();
    return useMemo(() => {
        const short = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, { day: "numeric", month: "short" });
        const long = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            month: "short",
        });
        return { long: (at: number) => long.format(at), short: (at: number) => short.format(at) };
    }, [locale]);
}

function useAccountNamed() {
    const { ledger } = useDashboard();
    return (id: string) => ledger.books.accounts.find((row) => row.localId === id) ?? null;
}

export function IntoCell({ record }: { record: Pick<ImportRecord, "accountIds"> }) {
    const { home } = useIntlayer("dashboard-import");
    const { photos } = useDashboard();
    const named = useAccountNamed();
    const [first] = record.accountIds;
    const account = record.accountIds.length === 1 && first ? named(first) : null;
    if (account) {
        return (
            <span className="text-muted-foreground flex min-w-0 items-center gap-2">
                <AccountTile account={accountLook(account)} photos={photos} size="sm" />
                <span className="truncate">{account.name}</span>
            </span>
        );
    }
    return (
        <span className="text-muted-foreground whitespace-nowrap">
            {record.accountIds.length > 1 ? home.accounts({ count: record.accountIds.length }) : home.noAccount}
        </span>
    );
}

export function NetFigure({ record }: { record: ImportRecord }) {
    const { money } = useDisplayFormat();
    const net = record.in - record.out;
    let tone = net > 0 ? "text-app-income" : "";
    if (record.undoneAt !== null) {
        tone = "text-muted-foreground line-through";
    }
    return <span className={`${FIGURE} ${tone}`}>{money(net, record.currency, "always")}</span>;
}

export function StatusBadge({ undone }: { undone: boolean }) {
    const { status } = useIntlayer("dashboard-import");
    return (
        <Badge className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium" variant={undone ? "outline" : "success"}>
            <i className="size-1.5 rounded-full bg-current" />
            {undone ? status.undone : status.imported}
        </Badge>
    );
}

/** The ledger's own copy of what an import added, for "See entries" to open the right days and accounts. */
export function useSeeEntries() {
    const { ledger } = useDashboard();
    const navigate = useNavigate();
    return (record: Pick<ImportRecord, "accountIds" | "entryIds">, uncategorized = false) => {
        const ids = new Set(record.entryIds);
        const dates = ledger.books.transactions.filter((row) => ids.has(row.localId)).map((row) => row.date);
        const first = dates.reduce((low, date) => Math.min(low, date), Number.POSITIVE_INFINITY);
        const last = dates.reduce((high, date) => Math.max(high, date), Number.NEGATIVE_INFINITY);
        void navigate({
            search: {
                ...(dates.length > 0 && {
                    from: isoDay(first, ledger.offsetAt(first)),
                    to: isoDay(last, ledger.offsetAt(last)),
                }),
                ...(record.accountIds.length > 0 && { accounts: record.accountIds.join(",") }),
                ...(uncategorized && { category: "uncategorized" }),
            },
            to: "/app/transactions",
        });
    };
}

function RowMenu({ record, store }: { record: ImportRecord; store: ImportStore }) {
    const { home } = useIntlayer("dashboard-import");
    const see = useSeeEntries();
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button aria-label={home.seeEntries.value} className="ms-auto" size="icon-sm" variant="ghost" />
                }
            >
                <Glyph icon={MoreVerticalIcon} size={16} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell">
                {record.undoneAt === null ? <Menu.Item onClick={() => see(record)}>{home.seeEntries}</Menu.Item> : null}
                <Menu.Item onClick={() => store.forget(record.id)} variant="destructive">
                    {home.forget}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function ImportTable({
    footer,
    records,
    store,
}: {
    footer?: ReactNode;
    records: readonly ImportRecord[];
    store: ImportStore;
}) {
    const { columns, undo } = useIntlayer("dashboard-import");
    const day = useRecordDay();
    const latest = undoable(store.snapshot());
    return (
        <>
            <Table
                className="max-sm:[&_tr>*:nth-child(3)]:hidden max-sm:[&_tr>*:nth-child(6)]:hidden"
                containerClassName="overflow-x-auto"
            >
                <Table.Header>
                    <Table.Row className="border-b-0">
                        <Table.Head className={HEAD}>{columns.date}</Table.Head>
                        <Table.Head className={HEAD}>{columns.source}</Table.Head>
                        <Table.Head className={HEAD}>{columns.into}</Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {columns.entries}
                        </Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {columns.net}
                        </Table.Head>
                        <Table.Head className={HEAD}>{columns.status}</Table.Head>
                        <Table.Head className={HEAD} />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {records.map((record) => (
                        <Table.Row key={record.id}>
                            <Table.Cell className={`${CELL} dash-figure text-muted-foreground whitespace-nowrap`}>
                                {day.short(record.at)}
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <span className="flex min-w-0 items-center gap-2.5 font-medium">
                                    <SourceTile size="sm" source={record.source} />
                                    <span className="max-w-56 truncate">{record.name}</span>
                                </span>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <IntoCell record={record} />
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} ${FIGURE}`}>
                                {record.entryIds.length.toLocaleString()}
                            </Table.Cell>
                            <Table.Cell align="end" className={CELL}>
                                <NetFigure record={record} />
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <StatusBadge undone={record.undoneAt !== null} />
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} w-0`}>
                                {latest?.id === record.id ? (
                                    <UndoDialog
                                        record={record}
                                        trigger={
                                            <Button className="gap-1.5" size="sm" variant="outline">
                                                <Glyph icon={Undo02Icon} size={14} />
                                                {undo}
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <RowMenu record={record} store={store} />
                                )}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            {footer}
        </>
    );
}

const READ_BY: Record<ImportSource, "readByAi" | "readByDevice" | "readByNotion"> = {
    csv: "readByDevice",
    moneyManager: "readByDevice",
    notion: "readByNotion",
    pdf: "readByAi",
};

export function LastImportCard({ record, rich }: { record: ImportRecord; rich: boolean }) {
    const { history, home } = useIntlayer("dashboard-import");
    const day = useRecordDay();
    const { money } = useDisplayFormat();
    const account = useImportAccount(record);
    const see = useSeeEntries();
    const standing = record.undoneAt === null;
    const offBy =
        record.statement === null ? null : record.statement.end - record.statement.start - (record.in - record.out);
    return (
        <Card
            action={
                rich ? null : (
                    <span className="dash-figure text-muted-foreground text-[13px]">{day.short(record.at)}</span>
                )
            }
            title={home.lastImport}
        >
            <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                <SourceTile source={record.source} />
                <div className="min-w-0">
                    <b className="block truncate text-sm leading-5 font-medium">{record.name}</b>
                    <small className="text-muted-foreground block truncate text-xs leading-4">
                        {rich
                            ? day.long(record.at)
                            : home.entriesInto({
                                  account: account?.name ?? home.accounts({ count: record.accountIds.length }).value,
                                  count: record.entryIds.length.toLocaleString(),
                              })}
                    </small>
                </div>
            </div>
            <div>
                {rich ? (
                    <>
                        <Line label={history.readBy}>{history[READ_BY[record.source]]}</Line>
                        <Line label={history.entries}>{record.entryIds.length.toLocaleString()}</Line>
                    </>
                ) : (
                    <Line label={home.net} tone={record.in - record.out > 0 ? "text-app-income" : ""}>
                        {money(record.in - record.out, record.currency, "always")}
                    </Line>
                )}
                <Line label={home.duplicatesSkipped}>{record.duplicates.toLocaleString()}</Line>
                {rich ? (
                    <>
                        <Line label={history.in} tone="text-app-income">
                            {money(record.in, record.currency, "always")}
                        </Line>
                        <Line label={history.out}>{money(-record.out, record.currency, "always")}</Line>
                        {offBy === null ? null : (
                            <Line label={history.balanceCheck}>
                                <Badge
                                    className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium"
                                    variant={Math.abs(offBy) < 0.005 ? "success" : "warning"}
                                >
                                    <i className="size-1.5 rounded-full bg-current" />
                                    {Math.abs(offBy) < 0.005
                                        ? history.matches
                                        : history.offBy({ amount: money(Math.abs(offBy), record.currency) })}
                                </Badge>
                            </Line>
                        )}
                    </>
                ) : null}
            </div>
            <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
                {rich && standing ? (
                    <Button className="w-full" onClick={() => see(record)} size="sm" variant="outline">
                        {history.seeEntries({ count: record.entryIds.length.toLocaleString() })}
                    </Button>
                ) : null}
                {standing ? (
                    <UndoDialog
                        record={record}
                        trigger={
                            <Button className="w-full gap-1.5" size="sm" variant="outline">
                                <Glyph icon={Undo02Icon} size={14} />
                                {home.undoImport}
                            </Button>
                        }
                    />
                ) : null}
                {rich ? <p className="text-muted-foreground mt-1 text-[13px] leading-5">{history.onlyLast}</p> : null}
            </div>
        </Card>
    );
}

function ImportKpi({ label, value }: { label: ReactNode; value: string }) {
    return (
        <Kpi className="gap-0">
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value className="dash-figure mt-2 mb-0.5 truncate leading-7 font-semibold tracking-[-0.04em]">
                {value}
            </Kpi.Value>
        </Kpi>
    );
}

export function HistoryKpis({ records }: { records: readonly ImportRecord[] }) {
    const { history } = useIntlayer("dashboard-import");
    const day = useRecordDay();
    const standing = records.filter((record) => record.undoneAt === null);
    const [last] = records;
    return (
        <KpiBand>
            <ImportKpi label={history.imports} value={records.length.toLocaleString()} />
            <ImportKpi
                label={history.entriesAdded}
                value={standing.reduce((sum, record) => sum + record.entryIds.length, 0).toLocaleString()}
            />
            <ImportKpi label={history.undone} value={(records.length - standing.length).toLocaleString()} />
            <ImportKpi label={history.lastImport} value={last ? day.short(last.at) : history.never.value} />
        </KpiBand>
    );
}

type Span = "30" | "all" | "year";

interface Filters {
    account: string | null;
    source: ImportSource | null;
    span: Span;
}

const SOURCES: readonly ImportSource[] = ["csv", "pdf", "notion", "moneyManager"];

function FilterChip({
    active,
    children,
    icon,
    options,
}: {
    active: boolean;
    children: ReactNode;
    icon: IconSvgElement;
    options: readonly { label: ReactNode; on: boolean; pick: () => void; value: string }[];
}) {
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        className={`h-8 gap-1.5 rounded-full px-3 ${active ? "border-primary/40 bg-primary/8" : ""}`}
                        size="sm"
                        variant="outline"
                    />
                }
            >
                <Glyph className="text-muted-foreground" icon={icon} size={14} />
                {children}
            </Menu.Trigger>
            <Menu.Content className="app-shell max-h-80 overflow-y-auto">
                {options.map((option) => (
                    <Menu.CheckboxItem checked={option.on} key={option.value} onCheckedChange={option.pick}>
                        {option.label}
                    </Menu.CheckboxItem>
                ))}
            </Menu.Content>
        </Menu>
    );
}

export function HistoryTable({ records, store }: { records: readonly ImportRecord[]; store: ImportStore }) {
    const { history, sources } = useIntlayer("dashboard-import");
    const named = useAccountNamed();
    const [filters, setFilters] = useState<Filters>({ account: null, source: null, span: "all" });
    const { now } = useDashboard().ledger;
    const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
    const shown = records.filter(
        (record) =>
            (filters.source === null || record.source === filters.source) &&
            (filters.account === null || record.accountIds.includes(filters.account)) &&
            (filters.span === "all" ||
                record.at >= (filters.span === "year" ? yearStart : now - RECENT_DAYS * MS_PER_DAY))
    );
    const sourceName: Record<ImportSource, ReactNode> = {
        csv: sources.csv,
        moneyManager: sources.moneyManager,
        notion: sources.notion,
        pdf: sources.pdf,
    };
    const accountIds = [...new Set(records.flatMap((record) => record.accountIds))];
    const set = (change: Partial<Filters>) => setFilters((current) => ({ ...current, ...change }));
    const spans: readonly [Span, ReactNode][] = [
        ["all", history.anyTime],
        ["30", history.last30],
        ["year", history.thisYear],
    ];
    return (
        <>
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
                <FilterChip
                    active={filters.source !== null}
                    icon={Note01Icon}
                    options={[
                        {
                            label: history.allSources,
                            on: filters.source === null,
                            pick: () => set({ source: null }),
                            value: "all",
                        },
                        ...SOURCES.filter((source) => records.some((record) => record.source === source)).map(
                            (source) => ({
                                label: sourceName[source],
                                on: filters.source === source,
                                pick: () => set({ source }),
                                value: source,
                            })
                        ),
                    ]}
                >
                    {filters.source === null ? history.source : sourceName[filters.source]}
                </FilterChip>
                <FilterChip
                    active={filters.account !== null}
                    icon={CreditCardIcon}
                    options={[
                        {
                            label: history.allAccounts,
                            on: filters.account === null,
                            pick: () => set({ account: null }),
                            value: "all",
                        },
                        ...accountIds.map((id) => ({
                            label: named(id)?.name ?? id,
                            on: filters.account === id,
                            pick: () => set({ account: id }),
                            value: id,
                        })),
                    ]}
                >
                    {filters.account === null ? history.account : (named(filters.account)?.name ?? history.account)}
                </FilterChip>
                <FilterChip
                    active={filters.span !== "all"}
                    icon={Calendar03Icon}
                    options={spans.map(([span, label]) => ({
                        label,
                        on: filters.span === span,
                        pick: () => set({ span }),
                        value: span,
                    }))}
                >
                    {filters.span === "all" ? history.date : spans.find(([span]) => span === filters.span)?.[1]}
                </FilterChip>
            </div>
            {shown.length === 0 ? (
                <p className={`${NOTE} py-10 text-center`}>{history.noMatch}</p>
            ) : (
                <ImportTable
                    footer={
                        <p className="text-muted-foreground px-4 py-3 text-[13px]">
                            {shown.length === 1 ? history.one : history.count({ count: shown.length.toLocaleString() })}
                        </p>
                    }
                    records={shown}
                    store={store}
                />
            )}
        </>
    );
}
