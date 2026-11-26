import Calendar02Icon from "@hugeicons/core-free-icons/Calendar02Icon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar } from "panelui-web/avatar";
import { Badge } from "panelui-web/badge";
import { Checkbox } from "panelui-web/checkbox";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { FeeTile, MerchantTile, TransferTile } from "@/components/ledger/tiles";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { LedgerRow, LedgerTransfer } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { photoSrc } from "@/lib/photo-src";

import { useDateFormat } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import type { Column, LayoutControls } from "./columns";
import { installmentTags } from "./model";
import type { EntryAuthors } from "./use-entry-authors";
import type { LedgerList } from "./use-ledger-list";

const FIGURE = "font-mono tabular-nums whitespace-nowrap";
const MUTED = "text-muted-foreground truncate";
const ROW = "group/row relative hover:bg-app-hover aria-selected:bg-app-tint/10";
const PICK = "relative z-1 w-10 pe-0";
const CAPTION = "text-muted-foreground text-app-caption block truncate font-normal";
const ENTRY_COLUMNS: readonly Column[] = [
    "merchant",
    "category",
    "tags",
    "account",
    "loggedBy",
    "date",
    "notes",
    "paidVia",
    "amount",
];

type HeadKey = Column | "fee" | "from" | "note" | "to";

export interface TablePicking {
    all: boolean;
    ids: ReadonlySet<string>;
    onPick: (id: string) => void;
    onPickAll: () => void;
    some: boolean;
}

interface LedgerTableProps {
    authors: EntryAuthors;
    renderAmount: (row: LedgerRow, content: ReactNode) => ReactNode;
    renderCategory: (row: LedgerRow, content: ReactNode) => ReactNode;
    renderTags: (row: LedgerRow, content: ReactNode) => ReactNode;
    label: string;
    layout: LayoutControls;
    list: LedgerList;
    onOpen: (row: FoldedRow) => void;
    picking: TablePicking;
    renderMenu: (row: FoldedRow) => ReactNode;
    rows: readonly FoldedRow[];
    selected: string | null;
    transfers: boolean;
}

export function LedgerTable({
    authors,
    renderAmount,
    renderCategory,
    renderTags,
    label,
    layout,
    list,
    onOpen,
    picking,
    renderMenu,
    rows,
    selected,
    transfers,
}: LedgerTableProps) {
    const { ledger } = useDashboard();
    const words = useIntlayer("dashboard-ledger");
    const { bulk, installmentOf, kind, recurring } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const plans = useMemo(() => installmentTags(ledger.books), [ledger.books]);
    const columns = transfers
        ? []
        : ENTRY_COLUMNS.filter(
              (column) => column === "merchant" || (layout.shown(column) && (column !== "loggedBy" || authors.shared))
          );
    const pickCell = (row: FoldedRow, name: string) => (
        <Table.Cell className={PICK}>
            <Checkbox
                aria-label={bulk.selectEntry({ name }).value}
                checked={picking.ids.has(row.id)}
                onCheckedChange={() => picking.onPick(row.id)}
            />
        </Table.Cell>
    );
    const opener = (row: FoldedRow, name: string) => (
        <button
            aria-current={selected === row.id ? "true" : undefined}
            className="truncate text-start outline-none after:absolute after:inset-0 focus-visible:underline"
            onClick={() => onOpen(row)}
            type="button"
        >
            {name}
        </button>
    );
    const caption = (day: string, category: ReactNode) => {
        const when = layout.shown("date") ? date.day(day) : null;
        const what = category !== null && layout.shown("category") ? category : null;
        if (when === null && what === null) {
            return null;
        }
        return (
            <span className={`${CAPTION} @3xl:hidden`}>
                {when}
                {what === null ? null : (
                    <span className="@xl:hidden">
                        {when === null ? "" : " · "}
                        {what}
                    </span>
                )}
            </span>
        );
    };
    const menuCell = (row: FoldedRow) => <Table.Cell className="relative z-1 w-10 ps-0">{renderMenu(row)}</Table.Cell>;
    const transferRow = (row: FoldedRow & LedgerTransfer) => {
        const figure = figureOf(ledger, row);
        const name = list.names.merchant(row);
        const tile = <TransferTile from={list.catalog.account(row.fromId)} to={list.catalog.account(row.toId)} />;
        if (!transfers) {
            const cells: Record<Column, ReactNode> = {
                account: <span className="truncate">{list.names.account(row.fromId)}</span>,
                amount: <span className="text-muted-foreground">{money(figure.amount, ledger.currency)}</span>,
                category: <span className="text-muted-foreground">{kind.transfer}</span>,
                date: date.day(row.day),
                merchant: (
                    <span className="flex min-w-0 items-center gap-3 font-medium">
                        {tile}
                        <span className="flex min-w-0 flex-col">
                            {opener(row, name)}
                            {caption(row.day, kind.transfer)}
                        </span>
                    </span>
                ),
                loggedBy: null,
                notes: <span className={MUTED}>{list.transferNote(row.id)}</span>,
                paidVia: null,
                tags: null,
            };
            return (
                <Table.Row aria-selected={picking.ids.has(row.id) || selected === row.id} className={ROW} key={row.id}>
                    {pickCell(row, name)}
                    {columns.map((column) => (
                        <Table.Cell
                            align={column === "amount" ? "end" : "start"}
                            className={`${column === "date" || column === "amount" ? FIGURE : "max-w-0"} ${NARROW[column] ?? ""}`}
                            key={column}
                        >
                            {cells[column]}
                        </Table.Cell>
                    ))}
                    {menuCell(row)}
                </Table.Row>
            );
        }
        return (
            <Table.Row aria-selected={picking.ids.has(row.id) || selected === row.id} className={ROW} key={row.id}>
                {pickCell(row, name)}
                <Table.Cell className="max-w-0">
                    <span className="flex min-w-0 items-center gap-3 font-medium">
                        {tile}
                        <span className="flex min-w-0 flex-col">
                            {opener(row, list.names.account(row.fromId))}
                            <span className={`${CAPTION} @3xl:hidden`}>
                                <span className="@xl:hidden">{list.names.account(row.toId)} · </span>
                                {date.day(row.day)}
                            </span>
                        </span>
                    </span>
                </Table.Cell>
                <Table.Cell className={`max-w-0 truncate ${NARROW.to}`}>{list.names.account(row.toId)}</Table.Cell>
                <Table.Cell className={`max-w-0 ${MUTED} ${NARROW.note}`}>{list.transferNote(row.id)}</Table.Cell>
                <Table.Cell className={`${FIGURE} text-muted-foreground ${NARROW.date}`}>
                    {date.day(row.day)}
                </Table.Cell>
                <Table.Cell align="end" className={`${FIGURE} text-muted-foreground ${NARROW.fee}`}>
                    {figure.fee === null ? "" : money(figure.fee, ledger.currency)}
                </Table.Cell>
                <Table.Cell align="end" className={FIGURE}>
                    {money(figure.amount, ledger.currency)}
                    {figure.arrived === null ? null : (
                        <span className="text-muted-foreground text-app-caption block">
                            {money(figure.arrived, row.arrivedCurrency)}
                        </span>
                    )}
                </Table.Cell>
                {menuCell(row)}
            </Table.Row>
        );
    };
    const entryRow = (row: FoldedRow & LedgerRow) => {
        const raw = list.catalog.transaction(row.id);
        const figure = figureOf(ledger, row);
        const name = list.names.merchant(row);
        const fee = row.feeFor !== null;
        const top = ledger.categories.get(row.topId);
        const plan = raw?.installmentId ? plans.get(raw.installmentId) : undefined;
        const reviewing = list.review.has(row.id);
        const logger = authors.authorOf(row);
        const author = authors.labelOf(logger);
        const authorName = (logger === null ? null : authors.names.get(logger)) ?? author;
        const category =
            row.topId === UNCATEGORIZED_ID && !fee ? (
                <span className="text-app-tint font-medium">{words.pickCategory}</span>
            ) : (
                <Badge className="max-w-full" variant="outline">
                    <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-current"
                        style={{ color: top?.color }}
                    />
                    <span className="truncate">{list.names.category(row.topId)}</span>
                </Badge>
            );
        const cells: Record<Column, ReactNode> = {
            account: <span className="truncate">{list.names.account(row.accountId)}</span>,
            amount: renderAmount(
                row,
                <span className={row.income ? "text-app-income" : undefined}>
                    {money(
                        row.income ? figure.amount : -figure.amount,
                        ledger.currency,
                        row.income ? "always" : "auto"
                    )}
                </span>
            ),
            category: fee ? null : renderCategory(row, category),
            date: date.day(row.day),
            merchant: (
                <span className="relative flex min-w-0 items-center gap-3 font-medium">
                    {reviewing ? (
                        <span
                            aria-label={words.review.dot.value}
                            className="bg-app-tint absolute -start-3 size-1.5 rounded-full"
                        />
                    ) : null}
                    {fee ? <FeeTile /> : <MerchantTile imageUrl={photoSrc(raw?.imageKey)} name={name} size="lg" />}
                    <span className="flex min-w-0 flex-col">
                        {opener(row, name)}
                        {caption(row.day, fee ? null : list.names.category(row.topId))}
                    </span>
                    {(raw?.recurringType ?? 0) > 0 ? (
                        <HugeiconsIcon
                            aria-label={recurring.value}
                            className="text-muted-foreground shrink-0"
                            icon={RepeatIcon}
                            size={12}
                        />
                    ) : null}
                    {plan ? (
                        <span className="text-muted-foreground text-app-caption flex shrink-0 items-center gap-1 font-mono font-normal">
                            <HugeiconsIcon aria-hidden icon={Calendar02Icon} size={13} />
                            {installmentOf({ at: String(plan.at), of: String(plan.of) })}
                        </span>
                    ) : null}
                </span>
            ),
            notes: <span className={MUTED}>{raw?.details ?? ""}</span>,
            loggedBy:
                author === null ? null : (
                    <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={authorName ?? author} size="xs" />
                        <span className="truncate">{author}</span>
                    </span>
                ),
            paidVia: <span className={MUTED}>{raw?.paidVia ?? ""}</span>,
            tags: renderTags(
                row,
                <span className="text-muted-foreground flex min-w-0 gap-1.5 truncate">
                    {list.tagsOf(row.id).map((tag) => (
                        <span key={tag.localId}>#{tag.name}</span>
                    ))}
                </span>
            ),
        };
        return (
            <Table.Row aria-selected={picking.ids.has(row.id) || selected === row.id} className={ROW} key={row.id}>
                {pickCell(row, name)}
                {columns.map((column) => (
                    <Table.Cell
                        align={column === "amount" ? "end" : "start"}
                        className={`${column === "date" || column === "amount" ? FIGURE : "max-w-0"} ${NARROW[column] ?? ""}`}
                        key={column}
                    >
                        {cells[column]}
                    </Table.Cell>
                ))}
                {menuCell(row)}
            </Table.Row>
        );
    };
    const heads: readonly { align: "end" | "start"; key: HeadKey; name: ReactNode }[] = transfers
        ? [
              { align: "start", key: "from", name: words.columns.from },
              { align: "start", key: "to", name: words.columns.to },
              { align: "start", key: "note", name: words.columns.note },
              { align: "start", key: "date", name: words.columns.date },
              { align: "end", key: "fee", name: words.columns.fee },
              { align: "end", key: "amount", name: words.columns.amount },
          ]
        : columns.map((column) => ({
              align: column === "amount" ? "end" : "start",
              key: column,
              name: words.columns[column],
          }));
    return (
        <Table aria-label={label} className="table-fixed" density={layout.density} framed>
            <Table.Header>
                <Table.Row>
                    <Table.Head className={PICK}>
                        <Checkbox
                            aria-label={bulk.selectAll.value}
                            checked={picking.all}
                            indeterminate={!picking.all && picking.some}
                            onCheckedChange={picking.onPickAll}
                        />
                    </Table.Head>
                    {heads.map((head) => (
                        <Table.Head
                            align={head.align}
                            className={`${WIDTHS[head.key] ?? ""} ${NARROW[head.key] ?? ""}`}
                            key={head.key}
                        >
                            {head.name}
                        </Table.Head>
                    ))}
                    <Table.Head className="w-10" />
                </Table.Row>
            </Table.Header>
            <Table.Body>{rows.map((row) => ("fromId" in row ? transferRow(row) : entryRow(row)))}</Table.Body>
        </Table>
    );
}

const NARROW: Partial<Record<HeadKey, string>> = {
    account: "hidden @4xl:table-cell",
    category: "hidden @xl:table-cell",
    date: "hidden @3xl:table-cell",
    fee: "hidden @xl:table-cell",
    note: "hidden @3xl:table-cell",
    notes: "hidden @7xl:table-cell",
    paidVia: "hidden @7xl:table-cell",
    tags: "hidden @5xl:table-cell",
    to: "hidden @xl:table-cell",
};

const WIDTHS: Partial<Record<HeadKey, string>> = {
    account: "w-36",
    amount: "w-32",
    category: "w-44",
    date: "w-24",
    fee: "w-24",
    loggedBy: "w-32",
    merchant: "@7xl:w-[15%]",
    notes: "w-48",
    paidVia: "w-32",
    tags: "w-36",
};
