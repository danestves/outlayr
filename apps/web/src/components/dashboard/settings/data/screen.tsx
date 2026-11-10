import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon";
import FolderOpenIcon from "@hugeicons/core-free-icons/FolderOpenIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { transactionsToCsv } from "@outlayr/money/transaction-csv";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext, useSearch } from "@tanstack/react-router";
import { Alert } from "panelui-web/alert";
import { AlertDialog } from "panelui-web/alert-dialog";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Frame } from "panelui-web/frame";
import { Input } from "panelui-web/input";
import { Radio, RadioGroup } from "panelui-web/radio-group";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useId, useMemo, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { MerchantTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { pushRows } from "@/lib/ledger-write";

import { settingsToasts } from "../categories/write";
import { Row, SectionHead, SettingsCard } from "../parts";
import {
    archiveFileName,
    archivePushes,
    archiveRowCount,
    buildArchive,
    csvFileName,
    deletedEntries,
    eraseRows,
    inRange,
    localDay,
    parseArchive,
    restoreEntryRows,
    serializeArchive,
} from "./model";
import type { ArchiveDocument, EraseScope, PulledRow, Range, RangeKey } from "./model";
import { DATA_TABS } from "./tabs";
import { download, pullRows } from "./write";

const DELETED_TABLES = ["transactions", "installmentPlans", "installments", "outsidePayments"] as const;
const DELETED_KEY = ["settings.deletedEntries"];
const CELL = "whitespace-nowrap";
const WIDE = "max-md:hidden";
const TWO_UP = "grid items-start gap-4 lg:grid-cols-2";
const nowMs = () => Date.now();
const GHOST_ROWS = ["a", "b", "c", "d", "e", "f"];
const PLACEHOLDER_ROWS: readonly PulledRow[] = ["a", "b", "c"].map((localId) => ({
    deletedAt: 0,
    fields: { amount: 10_000, date: 0, income: false, note: "Placeholder" },
    localId,
    restoredAt: null,
    table: "transactions",
    updatedAt: 0,
}));

const useLiveEntries = () => {
    const { ledger } = useDashboard();
    return ledger.books.transactions.filter((row) => row.deletedAt === null);
};

const FileTile = () => (
    <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
        <HugeiconsIcon icon={FolderOpenIcon} size={16} />
    </span>
);

function ExportTab() {
    const copy = useIntlayer("dashboard-data").export;
    const { ledger } = useDashboard();
    const entries = useLiveEntries();
    const [format, setFormat] = useState("csv");
    const [range, setRange] = useState<Range>({ from: "", key: "all", to: "" });
    const [busy, setBusy] = useState(false);
    const date = useDateFormat();
    const [now] = useState(() => new Date());
    const names = ledger.books.categories;
    const csv = useMemo(() => {
        const nameOf = new Map(names.map((row) => [row.localId, row.name]));
        const picked = entries
            .filter((row) => inRange(row.date, range, now))
            .toSorted((a, b) => b.date - a.date)
            .map((row) => ({
                amount: row.amount,
                categoryName: nameOf.get(row.categoryId ?? "") ?? null,
                currency: row.currency,
                date: new Date(row.date),
                exchangeRate: row.exchangeRate ?? null,
                exchangeRateType: row.exchangeRateType ?? null,
                income: row.income,
                note: row.note,
            }));
        return {
            body: transactionsToCsv(picked, ledger.currency),
            count: picked.length,
            first: picked.at(-1)?.date.getTime(),
            last: picked[0]?.date.getTime(),
        };
    }, [entries, names, ledger.currency, range, now]);
    const [header, sample] = csv.body.split("\n").map((line) => line.split(","));
    const isArchive = format === "archive";
    const exportLabel = isArchive ? copy.exportArchive : copy.exportCsv;
    const save = async () => {
        if (!isArchive) {
            download(csvFileName(now), csv.body, "text/csv;charset=utf-8");
            return;
        }
        setBusy(true);
        try {
            const document = buildArchive(await pullRows(), nowMs());
            download(archiveFileName(now), serializeArchive(document), "application/json");
        } catch {
            settingsToasts.add({ title: copy.failed.value, type: "destructive" });
        } finally {
            setBusy(false);
        }
    };
    const year = String(now.getFullYear());
    const month = (offset: number) =>
        new Intl.DateTimeFormat(undefined, { month: "long" }).format(
            new Date(now.getFullYear(), now.getMonth() + offset, 1)
        );
    const rangeOptions: readonly { label: ReactNode; value: RangeKey }[] = [
        { label: copy.allTime, value: "all" },
        { label: year, value: "year" },
        { label: month(0), value: "month" },
        { label: month(-1), value: "lastMonth" },
        { label: copy.custom, value: "custom" },
    ];
    return (
        <div className={TWO_UP}>
            <div className="flex min-w-0 flex-col gap-4">
                <SettingsCard title={copy.format}>
                    <RadioGroup
                        aria-label={copy.format.value}
                        className="gap-0"
                        onValueChange={setFormat}
                        value={format}
                    >
                        <Row
                            hint={copy.csvHint}
                            label={copy.csv}
                            leading={<Radio aria-label={copy.csv.value} value="csv" />}
                        />
                        <Row
                            hint={copy.archiveHint}
                            label={copy.archive}
                            leading={<Radio aria-label={copy.archive.value} value="archive" />}
                        />
                    </RadioGroup>
                </SettingsCard>
                {isArchive ? null : (
                    <SettingsCard
                        action={
                            csv.first === undefined || csv.last === undefined ? null : (
                                <span className="dash-figure text-muted-foreground text-[13px]">
                                    {date.day(localDay(csv.first))} - {date.day(localDay(csv.last))}
                                </span>
                            )
                        }
                        title={copy.range}
                    >
                        <div className="px-4 py-3">
                            <Chip.Group
                                aria-label={copy.range.value}
                                multiple={false}
                                onValueChange={(next) => {
                                    const [picked] = next;
                                    const option = rangeOptions.find(({ value }) => value === picked);
                                    if (option) {
                                        setRange({ ...range, key: option.value });
                                    }
                                }}
                                value={[range.key]}
                            >
                                {rangeOptions.map(({ label, value }) => (
                                    <Chip key={value} value={value}>
                                        {label}
                                    </Chip>
                                ))}
                            </Chip.Group>
                        </div>
                        {range.key === "custom" ? (
                            <div className="border-border grid grid-cols-2 gap-3 border-t px-4 py-3">
                                <Field>
                                    <Field.Label>{copy.from}</Field.Label>
                                    <Input
                                        onChange={(event) => setRange({ ...range, from: event.target.value })}
                                        type="date"
                                        value={range.from}
                                    />
                                </Field>
                                <Field>
                                    <Field.Label>{copy.to}</Field.Label>
                                    <Input
                                        onChange={(event) => setRange({ ...range, to: event.target.value })}
                                        type="date"
                                        value={range.to}
                                    />
                                </Field>
                            </div>
                        ) : null}
                    </SettingsCard>
                )}
                <Frame className="min-w-0">
                    <Frame.Panel>
                        <Row
                            hint={isArchive ? copy.wholeLedger : copy.leftOut}
                            label={
                                <span className="font-mono">
                                    {isArchive ? archiveFileName(now) : copy.entries({ count: csv.count })}
                                </span>
                            }
                        >
                            <Button disabled={busy} onClick={save} size="sm">
                                <HugeiconsIcon icon={Download04Icon} size={16} />
                                {busy ? copy.preparing : exportLabel}
                            </Button>
                        </Row>
                    </Frame.Panel>
                </Frame>
            </div>
            {isArchive ? null : (
                <div className="flex min-w-0 flex-col gap-4">
                    <SettingsCard
                        action={<span className="dash-figure text-muted-foreground text-[13px]">{header?.length}</span>}
                        title={copy.columns}
                    >
                        {header?.map((name, index) => (
                            <Row key={name} label={name}>
                                <span className="dash-figure text-muted-foreground max-w-[50%] truncate text-[13px]">
                                    {sample?.[index]}
                                </span>
                            </Row>
                        ))}
                    </SettingsCard>
                    <SettingsCard title={copy.notInFile}>
                        {[copy.leftNotes, copy.leftPhotos, copy.leftLooks, copy.leftSchedules].map((line) => (
                            <p className="text-muted-foreground px-4 py-2.5 text-[13px]" key={line.value}>
                                {line}
                            </p>
                        ))}
                    </SettingsCard>
                </div>
            )}
        </div>
    );
}

function RestoreTab({ onExport }: { onExport: () => void }) {
    const copy = useIntlayer("dashboard-data").restore;
    const { export: exportLabel } = useIntlayer("dashboard-data").tabs;
    const { dbClient } = useRouteContext({ from: "__root__" });
    const queryClient = useQueryClient();
    const { ledger } = useDashboard();
    const { books } = ledger;
    const entries = useLiveEntries();
    const input = useRef<HTMLInputElement>(null);
    const [badName, setBadName] = useState<string | null>(null);
    const [picked, setPicked] = useState<{ document: ArchiveDocument; name: string } | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const read = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        const document = parseArchive(await file.text());
        setBadName(document === null ? file.name : null);
        setPicked(document && { document, name: file.name });
        setConfirming(document !== null);
    };
    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        read(event.dataTransfer.files[0]);
    };
    const replace = async () => {
        if (!picked) {
            return;
        }
        setConfirming(false);
        setRestoring(true);
        try {
            const pushes = archivePushes(picked.document, await pullRows(), nowMs());
            if (pushes === null) {
                setBadName(picked.name);
                setPicked(null);
                return;
            }
            setProgress({ done: 0, total: pushes.length });
            await pushRows(dbClient, pushes, (done) => setProgress({ done, total: pushes.length }));
            queryClient.removeQueries({ queryKey: DELETED_KEY });
            setPicked(null);
            settingsToasts.add({ title: copy.done.value });
        } catch {
            settingsToasts.add({ title: copy.failed.value, type: "destructive" });
        } finally {
            setRestoring(false);
        }
    };
    const chooser = (
        <input
            accept=".json,application/json"
            aria-label={copy.choose.value}
            className="hidden"
            onChange={(event) => {
                read(event.target.files?.[0]);
                event.target.value = "";
            }}
            ref={input}
            type="file"
        />
    );
    const counts = [
        [copy.transactions, entries.length],
        [copy.categories, books.categories.filter((row) => row.deletedAt === null).length],
        [copy.budgets, books.budgets.filter((row) => row.deletedAt === null).length],
        [copy.accounts, books.accounts.filter((row) => row.deletedAt === null).length],
    ] as const;
    const restoreFooter = badName ? (
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="dash-figure text-muted-foreground truncate text-[13px]">{badName}</span>
            <Button onClick={() => input.current?.click()} size="sm" variant="outline">
                {copy.another}
            </Button>
        </div>
    ) : (
        restoring && <span className="text-muted-foreground text-[13px]">{copy.keepOpen}</span>
    );
    const ledgerStatus = badName ? copy.notChanged : copy.replaced;
    return (
        <div className={TWO_UP}>
            <SettingsCard footer={restoreFooter} title={copy.title}>
                <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">{copy.intro}</p>
                {chooser}
                {badName ? (
                    <Row
                        hint={copy.badBody}
                        label={copy.badTitle}
                        leading={
                            <span className="bg-destructive/10 text-destructive flex size-7 shrink-0 items-center justify-center rounded-lg">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                            </span>
                        }
                    />
                ) : null}
                {restoring ? (
                    <Row
                        hint={
                            <>
                                <span className="block font-mono">{picked?.name}</span>
                                {/* PanelUI has no progress part. */}
                                <span className="bg-muted mt-1.5 block h-1 overflow-hidden rounded-full">
                                    <span
                                        className="bg-primary block h-full rounded-full"
                                        style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                                    />
                                </span>
                            </>
                        }
                        label={copy.restoringRows({ count: picked ? archiveRowCount(picked.document) : 0 })}
                        leading={<FileTile />}
                    />
                ) : null}
                {!badName && picked && !restoring ? (
                    <Row
                        hint={`${archiveRowCount(picked.document)} ${copy.rows.value}`}
                        label={<span className="font-mono">{picked.name}</span>}
                        leading={<FileTile />}
                    >
                        <Button onClick={() => input.current?.click()} size="sm" variant="outline">
                            {copy.another}
                        </Button>
                    </Row>
                ) : null}
                {badName || picked || restoring ? null : (
                    // PanelUI has no file drop target.
                    <div
                        className="border-border m-4 flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={onDrop}
                    >
                        <HugeiconsIcon className="text-muted-foreground mb-1" icon={FolderOpenIcon} size={20} />
                        <b className="text-sm font-medium">{copy.action}</b>
                        <span className="text-muted-foreground mb-3 text-[13px]">{copy.drop}</span>
                        <Button onClick={() => input.current?.click()} size="sm">
                            {copy.choose}
                        </Button>
                    </div>
                )}
            </SettingsCard>
            <SettingsCard
                action={
                    <span className="dash-figure text-muted-foreground text-[13px]">
                        {restoring ? copy.beingReplaced : ledgerStatus}
                    </span>
                }
                footer={
                    restoring || badName ? null : (
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[13px]">{copy.exportFirst}</span>
                            <Button onClick={onExport} size="sm" variant="outline">
                                <HugeiconsIcon icon={Download04Icon} size={16} />
                                {exportLabel}
                            </Button>
                        </div>
                    )
                }
                title={copy.ledger}
            >
                {counts.map(([label, count]) => (
                    <Row key={label.value} label={label}>
                        <span className="dash-figure text-sm">{count}</span>
                    </Row>
                ))}
            </SettingsCard>
            <AlertDialog onOpenChange={setConfirming} open={confirming}>
                <AlertDialog.Content className="app-shell" tone="destructive">
                    <AlertDialog.Title>{copy.confirmTitle}</AlertDialog.Title>
                    <AlertDialog.Description>
                        {copy.confirmBody({ count: picked ? archiveRowCount(picked.document) : 0 })}
                    </AlertDialog.Description>
                    <AlertDialog.Footer>
                        <AlertDialog.Cancel>{copy.cancel}</AlertDialog.Cancel>
                        <AlertDialog.Action onClick={replace}>{copy.replace}</AlertDialog.Action>
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </AlertDialog>
        </div>
    );
}

function DeletedTab() {
    const copy = useIntlayer("dashboard-data").deleted;
    const committer = useLedgerCommitter();
    const queryClient = useQueryClient();
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const query = useDeletedRows();
    const accounts = useDeletedAccounts();
    const list = useMemo(() => deletedEntries(query.data ?? [], accounts), [query.data, accounts]);
    const categoryNames = useMemo(
        () => new Map(ledger.books.categories.map((row) => [row.localId, row.name])),
        [ledger.books.categories]
    );
    const restore = async (id: string) => {
        const rows = query.data ?? [];
        const push = restoreEntryRows(rows, id, accounts, nowMs());
        if (push.length === 0) {
            return;
        }
        const lifted = new Set(push.map((row) => `${row.table}:${row.localId}`));
        queryClient.setQueryData<readonly PulledRow[]>(DELETED_KEY, (current) =>
            current?.filter((row) => !lifted.has(`${row.table}:${row.localId}`))
        );
        const outcome = await committer.commit(push).settled;
        if (outcome.status === "failed") {
            settingsToasts.add({ title: copy.failed.value, type: "destructive" });
        }
        queryClient.invalidateQueries({ queryKey: DELETED_KEY });
    };
    if (query.isError) {
        return (
            <Alert tone="destructive" variant="plain">
                <Alert.Title>{copy.loadFailed}</Alert.Title>
                <Button onClick={() => query.refetch()} size="sm" variant="outline">
                    {copy.retry}
                </Button>
            </Alert>
        );
    }
    const loading = query.isPending;
    return (
        <SettingsCard
            action={
                list.length === 0 ? null : (
                    <span className="dash-figure text-muted-foreground text-[13px]">{list.length}</span>
                )
            }
            footer={list.length > 0 ? <span className="text-muted-foreground text-[13px]">{copy.footer}</span> : null}
            title={copy.title}
        >
            {list.length === 0 && !loading ? (
                <div>
                    <div aria-hidden className="divide-y mask-b-from-40%">
                        {GHOST_ROWS.map((row) => (
                            <div className="flex items-center gap-3 px-4 py-2" key={row}>
                                <span className="border-border size-5 rounded-md border" />
                                <span className="bg-muted h-1.5 w-14 rounded-full" />
                                <span className="border-border ms-auto h-4 w-16 rounded-md border" />
                                <span className="bg-muted h-1.5 w-12 rounded-full" />
                                <span className="bg-muted h-1.5 w-12 rounded-full" />
                            </div>
                        ))}
                    </div>
                    <div className="px-5 pt-4 pb-10 text-center">
                        <b className="text-sm font-semibold">{copy.emptyTitle}</b>
                        <p className="text-muted-foreground mx-auto mt-1 max-w-[300px] text-[13px] leading-5">
                            {copy.emptyBody}
                        </p>
                    </div>
                </div>
            ) : (
                <Skeleton loading={loading}>
                    <Table aria-label={copy.title.value} framed maxHeight="none">
                        <Table.Header className="in-data-[sticky]:bg-card">
                            <Table.Row>
                                <Table.Head>{copy.merchant}</Table.Head>
                                <Table.Head className={WIDE}>{copy.category}</Table.Head>
                                <Table.Head className={WIDE}>{copy.account}</Table.Head>
                                <Table.Head className={WIDE}>{copy.date}</Table.Head>
                                <Table.Head className={WIDE}>{copy.deletedOn}</Table.Head>
                                <Table.Head align="end">{copy.amount}</Table.Head>
                                <Table.Head />
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {(loading ? PLACEHOLDER_ROWS : list).map((row) => {
                                const note = String(row.fields.note ?? "");
                                const category = categoryNames.get(String(row.fields.categoryId));
                                const amount = money(
                                    Number(row.fields.amount),
                                    String(row.fields.currency ?? ledger.currency)
                                );
                                return (
                                    <Table.Row key={row.localId}>
                                        <Table.Cell className={`${CELL} max-w-[220px] font-medium`}>
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <MerchantTile name={note} />
                                                <span className="truncate">{note}</span>
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${WIDE} text-muted-foreground`}>
                                            {category ? (
                                                <Badge dot variant="outline">
                                                    {category}
                                                </Badge>
                                            ) : null}
                                        </Table.Cell>
                                        <Table.Cell
                                            className={`${CELL} ${WIDE} text-muted-foreground max-w-[180px] truncate`}
                                        >
                                            {ledger.accounts.get(String(row.fields.accountId))?.name}
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${WIDE} dash-figure text-muted-foreground`}>
                                            {date.day(localDay(Number(row.fields.date)))}
                                        </Table.Cell>
                                        <Table.Cell className={`${CELL} ${WIDE} dash-figure text-muted-foreground`}>
                                            {date.day(localDay(row.deletedAt ?? 0))}
                                        </Table.Cell>
                                        <Table.Cell align="end" className={`${CELL} dash-figure text-sm font-medium`}>
                                            {row.fields.income ? amount : `-${amount}`}
                                        </Table.Cell>
                                        <Table.Cell align="end" className={CELL}>
                                            {loading ? null : (
                                                <Button
                                                    aria-label={`${copy.restore.value} ${note}`}
                                                    onClick={() => restore(row.localId)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {copy.restore}
                                                </Button>
                                            )}
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table>
                </Skeleton>
            )}
        </SettingsCard>
    );
}

function EraseBody({
    busy,
    onBusy,
    onClose,
    scope,
}: {
    busy: boolean;
    onBusy: (busy: boolean) => void;
    onClose: () => void;
    scope: EraseScope;
}) {
    const { erase: copy, restore: restoreCopy } = useIntlayer("dashboard-data");
    const committer = useLedgerCommitter();
    const queryClient = useQueryClient();
    const count = useLiveEntries().length;
    const [typed, setTyped] = useState("");
    const formId = useId();
    const word = copy.word.value;
    const erase = async () => {
        onBusy(true);
        const rows = await pullRows().catch(() => null);
        const outcome = rows && (await committer.commit(eraseRows(rows, scope, nowMs())).settled);
        if (outcome?.status !== "saved") {
            settingsToasts.add({ title: copy.failed.value, type: "destructive" });
            onBusy(false);
            return;
        }
        queryClient.removeQueries({ queryKey: DELETED_KEY });
        onClose();
    };
    return (
        <>
            <Dialog.Header>
                <Dialog.Title>
                    {scope === "everything" ? copy.confirmEverythingTitle : copy.confirmTransactionsTitle}
                </Dialog.Title>
                <Dialog.Description>
                    {scope === "everything" ? copy.confirmEverythingBody : copy.confirmTransactionsBody}
                </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
                <form
                    id={formId}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (typed === word && !busy) {
                            erase();
                        }
                    }}
                >
                    <Field>
                        <Field.Label>
                            <span>
                                {copy.typeBefore} <span className="text-destructive">{word}</span> {copy.typeAfter}
                            </span>
                        </Field.Label>
                        <Input
                            autoComplete="off"
                            onChange={(event) => setTyped(event.target.value)}
                            placeholder={word}
                            value={typed}
                        />
                    </Field>
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close disabled={busy} render={<Button variant="secondary" />}>
                    {restoreCopy.cancel}
                </Dialog.Close>
                <Button disabled={typed !== word || busy} form={formId} type="submit" variant="destructive">
                    {copy.confirmAction({ count })}
                </Button>
            </Dialog.Footer>
        </>
    );
}

function EraseDialog({
    busy,
    onBusy,
    onClose,
    open,
    scope,
}: {
    busy: boolean;
    onBusy: (busy: boolean) => void;
    onClose: () => void;
    open: boolean;
    scope: EraseScope | null;
}) {
    return (
        <Dialog onOpenChange={(next) => next || busy || onClose()} open={open}>
            <Dialog.Content className="app-shell">
                {scope ? <EraseBody busy={busy} onBusy={onBusy} onClose={onClose} scope={scope} /> : null}
            </Dialog.Content>
        </Dialog>
    );
}

function EraseTab({ onExport }: { onExport: () => void }) {
    const copy = useIntlayer("dashboard-data").erase;
    const count = useLiveEntries().length;
    const [scope, setScope] = useState<EraseScope | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const show = (next: EraseScope) => {
        setScope(next);
        setBusy(false);
        setOpen(true);
    };
    return (
        <div className={TWO_UP}>
            <SettingsCard
                action={
                    <span className="dash-figure text-muted-foreground text-[13px]">
                        {count} {copy.logged}
                    </span>
                }
                footer={<span className="text-muted-foreground text-[13px]">{copy.footer}</span>}
                title={copy.title}
            >
                <Row hint={copy.transactionsOnlyHint} label={copy.transactionsOnly}>
                    <Button onClick={() => show("transactions")} size="sm" variant="outline">
                        <span className="text-destructive">{copy.action}</span>
                    </Button>
                </Row>
                <Row hint={copy.everythingHint} label={copy.everything}>
                    <Button onClick={() => show("everything")} size="sm" variant="outline">
                        <span className="text-destructive">{copy.action}</span>
                    </Button>
                </Row>
            </SettingsCard>
            <SettingsCard title={copy.before}>
                <Row hint={copy.archiveHint} label={copy.archive} leading={<FileTile />}>
                    <Button onClick={onExport} size="sm" variant="outline">
                        <HugeiconsIcon icon={Download04Icon} size={16} />
                        {copy.export}
                    </Button>
                </Row>
            </SettingsCard>
            <EraseDialog busy={busy} onBusy={setBusy} onClose={() => setOpen(false)} open={open} scope={scope} />
        </div>
    );
}

const useDeletedRows = () => useQuery({ queryFn: () => pullRows(DELETED_TABLES), queryKey: DELETED_KEY });

function useDeletedAccounts() {
    const { accounts } = useDashboard().ledger.books;
    return useMemo(
        () => new Set(accounts.filter((row) => row.deletedAt !== null).map((row) => row.localId)),
        [accounts]
    );
}

export function DataSettings() {
    const { sections } = useIntlayer("dashboard-settings");
    const { tabs } = useIntlayer("dashboard-data");
    const search: { tab?: (typeof DATA_TABS)[number] } = useSearch({ strict: false });
    const navigate = useNavigate();
    const tab = search.tab ?? "export";
    const open = (next: (typeof DATA_TABS)[number]) =>
        navigate({ replace: true, search: { tab: next }, to: "/app/settings/data" });
    const deleted = useDeletedRows();
    const accounts = useDeletedAccounts();
    const held = useMemo(() => deletedEntries(deleted.data ?? [], accounts).length, [deleted.data, accounts]);
    return (
        <>
            <SectionHead title={sections.data} />
            <Tabs onValueChange={(next) => open(next)} value={tab} variant="underline">
                <div className="overflow-x-auto">
                    <Tabs.List aria-label={sections.data.value}>
                        {DATA_TABS.map((name) => (
                            <Tabs.Trigger key={name} value={name}>
                                {tabs[name]}
                                {name === "deleted" && held > 0 ? (
                                    <Badge className="ms-1.5" variant="secondary">
                                        {held}
                                    </Badge>
                                ) : null}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </div>
            </Tabs>
            <div className="pt-4 pb-5">
                {tab === "export" ? <ExportTab /> : null}
                {tab === "restore" ? <RestoreTab onExport={() => open("export")} /> : null}
                {tab === "deleted" ? <DeletedTab /> : null}
                {tab === "erase" ? <EraseTab onExport={() => open("export")} /> : null}
            </div>
        </>
    );
}
