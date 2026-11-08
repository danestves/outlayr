import { RiRepeatLine } from "@remixicon/react";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { FeeTile, MerchantTile, TransferTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "../home/catalog";
import { useCategoryName } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import { ROW_HEIGHT, useLineWindow } from "./line-window";
import type { Line } from "./model";
import { useDayTitle } from "./use-day-title";

const DAY_HEIGHT = 32;
const ISO_CURRENCY = /^[A-Z]{3}$/u;

const RING = "[--tile-ring:var(--color-card)]";
const STRIPE = "bg-muted/40 [--tile-ring:color-mix(in_oklab,var(--muted)_40%,var(--color-card))]";
const ROW = "relative h-[51px] border-0 hover:bg-muted/40 has-[button:focus-visible]:bg-muted/60";
const HEAD = "first:ps-3.5 last:pe-3.5";
const CELL = "h-[51px] overflow-hidden px-1.5 py-0 align-middle first:ps-3.5 last:pe-3.5 @sm:px-3";
const SIDE = `${CELL} hidden truncate @2xl:table-cell`;
const FIGURE = `${CELL} dash-figure whitespace-nowrap`;
const SECOND_LINE = "dash-figure text-muted-foreground block text-xs leading-4";
// The column header sticks under the mobile bar below lg, and each day's header sticks under the column header.
const HEAD_STICKY = "in-data-[sticky]:bg-card max-lg:top-[calc(52px+env(safe-area-inset-top))]!";
const DAY_STICKY = "sticky top-[calc(92px+env(safe-area-inset-top))] z-[1] lg:top-10";

interface LedgerTableProps {
    /** Shows the Account column; an account's own page hides it. */
    account?: boolean;
    empty?: ReactNode;
    label: string;
    lines: readonly Line[];
    onOpen: (row: FoldedRow) => void;
    selected?: string | null;
}

/** The ledger as a table: rows in the ledger currency, fees folded, a header over each day when there is one. */
export function LedgerTable({ account = true, empty, label, lines, onOpen, selected = null }: LedgerTableProps) {
    const { ledger, photos: accountPhotos } = useDashboard();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const words = useIntlayer("dashboard-transactions");
    const categoryName = useCategoryName();
    const dayTitle = useDayTitle();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const grouped = lines[0]?.type === "day";
    const heights = useMemo(() => lines.map((line) => (line.type === "day" ? DAY_HEIGHT : ROW_HEIGHT)), [lines]);
    const { after, before, body, first, last } = useLineWindow(heights);
    const shown = lines.slice(first, last);
    const imageKeys = useMemo(
        () => [
            ...new Set(
                shown.flatMap((line) => {
                    const key =
                        line.type === "row" && !("fromId" in line.row)
                            ? catalog.transaction(line.row.id)?.imageKey
                            : null;
                    return key ? [key] : [];
                })
            ),
        ],
        [catalog, shown]
    );
    const photos = useImageUrls(imageKeys);
    const columns = account ? 4 : 3;
    const accountName = (id: string | null) =>
        id === null ? copy.noAccount.value : (ledger.accounts.get(id)?.name ?? "");
    // Stripes restart under each day so a window that starts mid-list never flips them.
    const stripeOf = (index: number) => {
        let rows = 0;
        for (let at = index - 1; at >= 0 && lines[at]?.type === "row"; at -= 1) {
            rows += 1;
        }
        return rows % 2 === 1;
    };
    const secondLine = (row: FoldedRow, figure: ReturnType<typeof figureOf>) => {
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
        const raw = "fromId" in row ? undefined : catalog.transaction(row.id);
        if (raw?.currency && raw.currency !== ledger.currency && ISO_CURRENCY.test(raw.currency)) {
            return <span className={SECOND_LINE}>{money(raw.amount, raw.currency)}</span>;
        }
        return null;
    };
    const merchantCell = (
        row: FoldedRow,
        tile: ReactNode,
        name: string,
        day: string,
        kind: string,
        recurring: boolean
    ) => (
        <Table.Cell className={`${CELL} max-w-0 @2xl:max-w-none`}>
            <span className="flex items-center gap-3 font-medium">
                {tile}
                <span className="min-w-0">
                    <button
                        aria-current={selected === row.id ? "true" : undefined}
                        className="flex max-w-full items-center gap-1.5 text-left outline-none after:absolute after:inset-0"
                        onClick={() => onOpen(row)}
                        type="button"
                    >
                        <span className="truncate">{name}</span>
                        {recurring ? (
                            <RiRepeatLine
                                aria-label={words.recurring.value}
                                className="text-muted-foreground shrink-0"
                                size={12}
                            />
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
    const rowOf = (row: FoldedRow, index: number) => {
        const figure = figureOf(ledger, row);
        const day = grouped ? "" : dayTitle(row.day);
        const tone = `${ROW} ${stripeOf(index) ? STRIPE : RING} ${selected === row.id ? "bg-muted/70" : ""}`;
        if ("fromId" in row) {
            const names = `${accountName(row.fromId)} → ${accountName(row.toId)}`;
            return (
                <Table.Row aria-rowindex={index + 2} className={tone} key={row.id}>
                    {merchantCell(
                        row,
                        <TransferTile
                            from={catalog.account(row.fromId)}
                            photos={accountPhotos}
                            to={catalog.account(row.toId)}
                        />,
                        names,
                        day,
                        copy.transfer.value,
                        false
                    )}
                    <Table.Cell className={`${SIDE} text-muted-foreground`}>{copy.transfer}</Table.Cell>
                    {account ? <Table.Cell aria-label={copy.columns.account.value} className={SIDE} /> : null}
                    <Table.Cell align="end" className={`${FIGURE} text-muted-foreground`}>
                        {money(figure.amount, ledger.currency)}
                        {secondLine(row, figure)}
                    </Table.Cell>
                </Table.Row>
            );
        }
        const top = ledger.categories.get(row.topId);
        const name = top ? categoryName(top) : "";
        const merchant = row.note.trim() || name;
        const raw = catalog.transaction(row.id);
        const standsAlone = row.feeFor !== null;
        const feeKind = raw?.feeForId ? copy.cardFee.value : copy.transferFee.value;
        const kind = standsAlone ? feeKind : name;
        const imageKey = raw?.imageKey;
        return (
            <Table.Row aria-rowindex={index + 2} className={tone} key={row.id}>
                {merchantCell(
                    row,
                    standsAlone ? (
                        <FeeTile />
                    ) : (
                        <MerchantTile
                            imageUrl={imageKey ? photos?.get(imageKey) : undefined}
                            name={merchant}
                            size="lg"
                        />
                    ),
                    merchant,
                    day,
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
                    {secondLine(row, figure)}
                </Table.Cell>
            </Table.Row>
        );
    };
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
                    <Table.Head className={`${HEAD} w-full @2xl:w-[38%]`}>{copy.columns.merchant}</Table.Head>
                    <Table.Head className={`${HEAD} hidden w-[20%] @2xl:table-cell`}>
                        {copy.columns.category}
                    </Table.Head>
                    {account ? (
                        <Table.Head className={`${HEAD} hidden w-[20%] @2xl:table-cell`}>
                            {copy.columns.account}
                        </Table.Head>
                    ) : null}
                    <Table.Head align="end" className={`${HEAD} w-px @2xl:w-[22%]`}>
                        {copy.columns.amount}
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
                        return rowOf(line.row, index);
                    }
                    const title = dayTitle(line.day);
                    return (
                        <tr aria-rowindex={index + 2} className="h-8" key={line.day}>
                            <th
                                className={`${DAY_STICKY} bg-card text-muted-foreground border-border h-8 border-b px-3.5 text-left text-xs font-medium`}
                                aria-label={`${title}, ${money(line.net, ledger.currency, "always")}`}
                                colSpan={columns}
                                scope="colgroup"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-foreground">{title}</span>
                                    <span className={`dash-figure ml-auto ${line.net > 0 ? "text-app-income" : ""}`}>
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
