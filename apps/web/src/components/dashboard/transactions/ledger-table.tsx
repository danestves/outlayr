import Calendar02Icon from "@hugeicons/core-free-icons/Calendar02Icon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Checkbox } from "panelui-web/checkbox";
import { Table } from "panelui-web/table";
import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { FeeTile, MerchantTile, TransferTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "../home/catalog";
import type { Catalog } from "../home/catalog";
import { useCategoryName } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import { ROW_HEIGHT, useLineWindow } from "./line-window";
import { installmentTags } from "./model";
import type { Line } from "./model";
import { useDayParts } from "./use-day-title";

const DAY_HEIGHT = 34;
const ISO_CURRENCY = /^[A-Z]{3}$/u;

const RING = "[--tile-ring:var(--color-card)]";
const STRIPE = "bg-muted/40 [--tile-ring:color-mix(in_oklab,var(--muted)_40%,var(--color-card))]";
const ROW = "relative h-[51px] border-0 hover:bg-muted/40 has-[button:focus-visible]:bg-muted/60";
const HEAD = "first:ps-3.5 last:pe-3.5";
// Checkboxes sit above the row's stretched button. Bulk actions are for wider screens; the sheet deletes on a phone.
const PICK = "relative z-[1] hidden w-10 px-0 align-middle first:ps-3.5 @2xl:table-cell";
const AFTER_PICK = "@max-2xl:ps-3.5! @max-2xl:w-full";
const CELL = "h-[51px] overflow-hidden px-1.5 py-0 align-middle first:ps-3.5 last:pe-3.5 @sm:px-3";
const SIDE = `${CELL} hidden truncate @2xl:table-cell`;
const FIGURE = `${CELL} dash-figure whitespace-nowrap`;
const SECOND_LINE = "dash-figure text-muted-foreground block text-xs leading-4";
// A phone reads each row without column names, so its day headers stick to the top of the list.
const HEAD_STICKY = "in-data-[sticky]:bg-card max-sm:hidden";
const DAY_STICKY = "sticky top-0 z-[1] sm:top-10";
const LIT = "bg-primary/10 hover:bg-primary/10 [--tile-ring:color-mix(in_oklab,var(--primary)_10%,var(--color-card))]";

interface EntryRowProps {
    account: boolean;
    catalog: Catalog;
    day: string;
    imageUrl: string | undefined;
    index: number;
    installment: { at: number; of: number } | undefined;
    onOpen: (row: FoldedRow) => void;
    onPick: ((id: string) => void) | null;
    picked: boolean;
    row: FoldedRow;
    selected: boolean;
    stripe: boolean;
}

function EntryRowView({
    account,
    catalog,
    day,
    imageUrl,
    index,
    installment,
    onOpen,
    onPick,
    picked,
    row,
    selected,
    stripe,
}: EntryRowProps) {
    const { ledger, photos: accountPhotos } = useDashboard();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const { bulk, installmentOf, recurring: recurringLabel } = useIntlayer("dashboard-transactions");
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const figure = figureOf(ledger, row);
    const accountName = (id: string | null) =>
        id === null ? copy.noAccount.value : (ledger.accounts.get(id)?.name ?? "");
    const raw = "fromId" in row ? undefined : catalog.transaction(row.id);
    const tone = `${ROW} ${stripe ? STRIPE : RING} ${selected || picked ? LIT : ""}`;
    const secondLine = () => {
        if (figure.arrived !== null && "fromId" in row) {
            const arrived = money(figure.arrived, row.arrivedCurrency);
            return (
                <span className={SECOND_LINE}>
                    <span aria-hidden>→ {arrived}</span>
                    <span className="sr-only">{copy.arrived({ amount: arrived })}</span>
                </span>
            );
        }
        if (figure.fee !== null) {
            return (
                <span className={SECOND_LINE}>
                    +{money(figure.fee, ledger.currency)} {copy.feeWord}
                </span>
            );
        }
        if (raw?.currency && raw.currency !== ledger.currency && ISO_CURRENCY.test(raw.currency)) {
            return <span className={SECOND_LINE}>{money(raw.amount, raw.currency)}</span>;
        }
        return null;
    };
    const pickCell = (name: string) =>
        onPick ? (
            <Table.Cell className={PICK}>
                <Checkbox
                    aria-label={bulk.selectEntry({ name }).value}
                    checked={picked}
                    className="align-middle"
                    onCheckedChange={() => onPick(row.id)}
                />
            </Table.Cell>
        ) : null;
    const merchantCell = (tile: ReactNode, name: string, kind: string, recurring: boolean) => (
        <Table.Cell className={`${CELL} ${AFTER_PICK} max-w-0 @2xl:max-w-none`}>
            {selected ? <span aria-hidden className="bg-primary absolute inset-y-0 left-0 w-0.5" /> : null}
            <span className="flex items-center gap-3 font-medium">
                {tile}
                <span className="min-w-0">
                    <button
                        aria-current={selected ? "true" : undefined}
                        className="flex max-w-full items-center gap-1.5 text-left outline-none after:absolute after:inset-0"
                        onClick={() => onOpen(row)}
                        type="button"
                    >
                        <span className="truncate">{name}</span>
                        {recurring ? (
                            <HugeiconsIcon
                                icon={RepeatIcon}
                                aria-label={recurringLabel.value}
                                className="text-muted-foreground shrink-0"
                                size={12}
                            />
                        ) : null}
                        {installment ? (
                            <span className="dash-figure text-muted-foreground ml-1.5 flex shrink-0 items-center gap-1 text-xs font-normal max-sm:hidden">
                                <HugeiconsIcon icon={Calendar02Icon} aria-hidden size={13} />
                                {installmentOf({ at: String(installment.at), of: String(installment.of) })}
                            </span>
                        ) : null}
                    </button>
                    <span
                        className={`text-muted-foreground block truncate text-xs font-normal ${day === "" ? "@2xl:hidden" : ""}`}
                    >
                        {day}
                        <span className="@2xl:hidden">
                            {day === "" || kind === "" ? "" : " · "}
                            {kind}
                        </span>
                    </span>
                </span>
            </span>
        </Table.Cell>
    );
    if ("fromId" in row) {
        return (
            <Table.Row aria-rowindex={index + 2} className={tone}>
                {pickCell(`${accountName(row.fromId)} → ${accountName(row.toId)}`)}
                {merchantCell(
                    <TransferTile
                        from={catalog.account(row.fromId)}
                        photos={accountPhotos}
                        to={catalog.account(row.toId)}
                    />,
                    `${accountName(row.fromId)} → ${accountName(row.toId)}`,
                    copy.transfer.value,
                    false
                )}
                <Table.Cell className={`${SIDE} text-muted-foreground`}>{copy.transfer}</Table.Cell>
                {account ? <Table.Cell aria-label={copy.columns.account.value} className={SIDE} /> : null}
                <Table.Cell align="end" className={`${FIGURE} text-muted-foreground`}>
                    {money(figure.amount, ledger.currency)}
                    {secondLine()}
                </Table.Cell>
            </Table.Row>
        );
    }
    const top = ledger.categories.get(row.topId);
    const name = top ? categoryName(top) : "";
    const merchant = row.note.trim() || name;
    const standsAlone = row.feeFor !== null;
    const feeKind = raw?.feeForId ? copy.cardFee.value : copy.transferFee.value;
    const kind = standsAlone ? feeKind : name;
    return (
        <Table.Row aria-rowindex={index + 2} className={tone}>
            {pickCell(merchant)}
            {merchantCell(
                standsAlone ? <FeeTile /> : <MerchantTile imageUrl={imageUrl} name={merchant} size="lg" />,
                merchant,
                kind,
                (raw?.recurringType ?? 0) > 0
            )}
            <Table.Cell className={SIDE}>
                {standsAlone ? (
                    <span className="text-muted-foreground">{kind}</span>
                ) : (
                    <span className="flex min-w-0 items-center gap-2">
                        <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full bg-current"
                            style={{ color: top?.color }}
                        />
                        <span className="truncate">{name}</span>
                    </span>
                )}
            </Table.Cell>
            {account ? (
                <Table.Cell className={`${SIDE} text-muted-foreground`}>{accountName(row.accountId)}</Table.Cell>
            ) : null}
            <Table.Cell align="end" className={`${FIGURE} ${row.income ? "text-app-income" : ""}`}>
                {money(row.income ? figure.amount : -figure.amount, ledger.currency, "always")}
                {secondLine()}
            </Table.Cell>
        </Table.Row>
    );
}

// Memoized so a scroll that shifts the window renders only the rows coming into view.
const EntryRow = memo(EntryRowView);

// Stripes restart under each day so a window that starts mid-list never flips them.
function stripesOf(lines: readonly Line[]) {
    const stripes: boolean[] = [];
    let run = 0;
    for (const line of lines) {
        run = line.type === "day" ? 0 : run + 1;
        stripes.push(run % 2 === 0);
    }
    return stripes;
}

const uniqueKeys = (keyList: string) => (keyList === "" ? [] : [...new Set(keyList.split(" "))]);

/** Turns on the checkbox column. */
export interface TablePicking {
    all: boolean;
    ids: ReadonlySet<string>;
    onPick: (id: string) => void;
    onPickAll: () => void;
    some: boolean;
}

interface LedgerTableProps {
    /** Shows the Account column; an account's own page hides it. */
    account?: boolean;
    empty?: ReactNode;
    label: string;
    lines: readonly Line[];
    onOpen: (row: FoldedRow) => void;
    picking?: TablePicking;
    selected?: string | null;
    /** Sits beside the Amount column's name. */
    sort?: ReactNode;
}

/** The ledger as a table: rows in the ledger currency, fees folded, a header over each day when there is one. */
export function LedgerTable({
    account = true,
    empty,
    label,
    lines,
    onOpen,
    picking,
    selected = null,
    sort,
}: LedgerTableProps) {
    const { bulk } = useIntlayer("dashboard-transactions");
    const { ledger } = useDashboard();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const dayParts = useDayParts();
    const dayText = (day: string) => {
        const { date, lead } = dayParts(day);
        return lead ? `${lead} · ${date}` : date;
    };
    const tags = useMemo(() => installmentTags(ledger.books), [ledger.books]);
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const grouped = lines[0]?.type === "day";
    const heights = useMemo(() => lines.map((line) => (line.type === "day" ? DAY_HEIGHT : ROW_HEIGHT)), [lines]);
    const stripes = useMemo(() => stripesOf(lines), [lines]);
    const { after, before, body, first, last } = useLineWindow(heights);
    const shown = lines.slice(first, last);
    const keyList = shown
        .flatMap((line) => {
            const key =
                line.type === "row" && !("fromId" in line.row) ? catalog.transaction(line.row.id)?.imageKey : null;
            return key ? [key] : [];
        })
        .join(" ");
    const photos = useImageUrls(uniqueKeys(keyList));
    const columns = (account ? 4 : 3) + (picking ? 1 : 0);
    return (
        <Table
            aria-label={label}
            aria-rowcount={lines.length + 1}
            className="@2xl:table-fixed"
            containerClassName="overflow-clip"
            maxHeight="none"
        >
            <Table.Header className={HEAD_STICKY}>
                <Table.Row aria-rowindex={1}>
                    {picking ? (
                        <Table.Head className={PICK}>
                            <Checkbox
                                aria-label={bulk.selectAll.value}
                                checked={picking.all}
                                className="align-middle"
                                indeterminate={!picking.all && picking.some}
                                onCheckedChange={picking.onPickAll}
                            />
                        </Table.Head>
                    ) : null}
                    <Table.Head className={`${HEAD} ${AFTER_PICK} w-full @2xl:w-[38%]`}>
                        {copy.columns.merchant}
                    </Table.Head>
                    <Table.Head className={`${HEAD} hidden w-[20%] @2xl:table-cell`}>
                        {copy.columns.category}
                    </Table.Head>
                    {account ? (
                        <Table.Head className={`${HEAD} hidden w-[20%] @2xl:table-cell`}>
                            {copy.columns.account}
                        </Table.Head>
                    ) : null}
                    <Table.Head align="end" className={`${HEAD} w-px @2xl:w-[22%]`}>
                        <span className="inline-flex items-center gap-1">
                            {copy.columns.amount}
                            {sort}
                        </span>
                    </Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body ref={body}>
                {lines.length === 0 && empty ? (
                    <Table.Row aria-rowindex={2} className="border-0">
                        <Table.Cell className="p-0" colSpan={columns}>
                            {empty}
                        </Table.Cell>
                    </Table.Row>
                ) : null}
                {before > 0 ? (
                    <tr aria-hidden>
                        <td aria-label={label} colSpan={columns} style={{ height: before }} />
                    </tr>
                ) : null}
                {shown.map((line, offset) => {
                    const index = first + offset;
                    if (line.type === "row") {
                        const raw = catalog.transaction(line.row.id);
                        const imageKey = raw?.imageKey;
                        return (
                            <EntryRow
                                account={account}
                                catalog={catalog}
                                day={grouped ? "" : dayText(line.row.day)}
                                imageUrl={imageKey ? photos?.get(imageKey) : undefined}
                                index={index}
                                installment={raw?.installmentId ? tags.get(raw.installmentId) : undefined}
                                key={line.row.id}
                                onOpen={onOpen}
                                onPick={picking?.onPick ?? null}
                                picked={picking?.ids.has(line.row.id) ?? false}
                                row={line.row}
                                selected={selected === line.row.id}
                                stripe={stripes[index] ?? false}
                            />
                        );
                    }
                    const { date, lead } = dayParts(line.day);
                    return (
                        <tr aria-rowindex={index + 2} className="h-[34px]" key={line.day}>
                            <th
                                className={`${DAY_STICKY} bg-card text-muted-foreground border-border h-[34px] border-b px-3.5 text-left text-xs font-medium`}
                                aria-label={`${dayText(line.day)}, ${money(line.net, ledger.currency, "always")}`}
                                colSpan={columns}
                                scope="colgroup"
                            >
                                <span className="flex items-center gap-2">
                                    {lead ? <span className="text-foreground">{lead}</span> : null}
                                    <span className={lead ? "max-sm:hidden" : "text-foreground"}>{date}</span>
                                    <span className="dash-figure ml-auto">
                                        {money(line.net, ledger.currency, "always")}
                                    </span>
                                </span>
                            </th>
                        </tr>
                    );
                })}
                {after > 0 ? (
                    <tr aria-hidden>
                        <td aria-label={label} colSpan={columns} style={{ height: after }} />
                    </tr>
                ) : null}
            </Table.Body>
        </Table>
    );
}
