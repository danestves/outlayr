import Caret from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Left from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import Right from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, LookTile, MerchantTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { cn } from "@/lib/utils";

import { useCatalog, useImageUrls } from "./catalog";
import { useCategoryName, useDateFormat, timeOfDay } from "./format";
import { pageOf, viewRows } from "./rows";
import type { TransactionSort } from "./rows";

const SORTS = ["newest", "oldest", "largest"] as const satisfies readonly TransactionSort[];

const CELL = "text-muted-foreground";

export function Transactions() {
    const { filters, ledger, photos: accountPhotos } = useDashboard();
    const { category, period } = filters;
    const copy = useIntlayer("dashboard-home");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { clockTime, money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const [sort, setSort] = useState<TransactionSort>("newest");
    const [page, setPage] = useState(0);
    const rows = useMemo(
        () => viewRows(ledger, { accounts: filters.accounts, category, period }, sort),
        [category, filters.accounts, ledger, period, sort]
    );
    const view = pageOf(rows, page);
    const keys = useMemo(
        () => [
            ...new Set(
                view.rows.flatMap((row) => {
                    const key = "fromId" in row ? null : catalog.transaction(row.id)?.imageKey;
                    return key ? [key] : [];
                })
            ),
        ],
        [catalog, view.rows]
    );
    const photos = useImageUrls(keys);
    const selected = category === null ? undefined : ledger.categories.get(category);
    const count =
        rows.length === 1 ? copy.transactions.countOne.value : copy.transactions.count({ count: rows.length }).value;
    const { columns } = copy.transactions;
    return (
        <section aria-labelledby="transactions-title" className="border-border border-t">
            <div className="flex min-h-[42px] items-center gap-2 px-5 pt-1">
                <h2 className="text-[13px] font-semibold" id="transactions-title">
                    {copy.transactions.title}
                </h2>
                <span className="text-muted-foreground truncate text-xs">
                    {selected ? `${categoryName(selected)} · ${count}` : count}
                </span>
                <Menu>
                    <Menu.Trigger
                        render={<Button className="ml-auto h-7 gap-1 px-2.5 text-xs" size="sm" variant="outline" />}
                    >
                        {copy.transactions.sort.label}: {copy.transactions.sort[sort]}
                        <HugeiconsIcon className="size-3.5" icon={Caret} />
                    </Menu.Trigger>
                    <Menu.Content align="end" className="app-shell ph-no-capture">
                        <Menu.RadioGroup
                            onValueChange={(next) => {
                                setSort(SORTS.find((each) => each === next) ?? "newest");
                                setPage(0);
                            }}
                            value={sort}
                        >
                            {SORTS.map((each) => (
                                <Menu.RadioItem closeOnClick key={each} value={each}>
                                    {copy.transactions.sort[each]}
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </Menu.Content>
                </Menu>
            </div>
            {rows.length === 0 ? (
                <p className="text-muted-foreground px-5 py-8 text-sm">{copy.transactions.empty}</p>
            ) : (
                <Table containerClassName="px-5" density="compact">
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>{columns.merchant}</Table.Head>
                            {selected ? null : <Table.Head>{columns.category}</Table.Head>}
                            <Table.Head className="hidden md:table-cell">{columns.account}</Table.Head>
                            <Table.Head>{columns.date}</Table.Head>
                            {selected ? <Table.Head className="hidden lg:table-cell">{columns.note}</Table.Head> : null}
                            <Table.Head align="end">{columns.amount}</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {view.rows.map((row) => {
                            const when = (
                                <Table.Cell className={cn(CELL, "whitespace-nowrap")}>
                                    {date.weekday(row.day)} · {clockTime(timeOfDay(row.at, ledger.offsetAt(row.at)))}
                                </Table.Cell>
                            );
                            if ("fromId" in row) {
                                const from = catalog.account(row.fromId);
                                const names = [row.fromId, row.toId].map((id) => ledger.accounts.get(id)?.name ?? "");
                                return (
                                    <Table.Row key={row.id}>
                                        <Table.Cell>
                                            <span className="flex items-center gap-2 font-medium">
                                                {from ? (
                                                    <AccountTile account={from} photos={accountPhotos} size="sm" />
                                                ) : null}
                                                <span className="truncate">{names.join(" → ")}</span>
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell className={CELL}>{copy.transactions.transfer}</Table.Cell>
                                        <Table.Cell className="hidden md:table-cell" />
                                        {when}
                                        <Table.Cell align="end" className={cn(CELL, "font-mono whitespace-nowrap")}>
                                            {money(row.amount, ledger.currency)}
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }
                            const book = catalog.transaction(row.id);
                            const top = ledger.categories.get(row.topId);
                            const merchant = row.note.trim() || (top ? categoryName(top) : "");
                            const imageKey = book?.imageKey;
                            return (
                                <Table.Row key={row.id}>
                                    <Table.Cell>
                                        <span className="flex items-center gap-2 font-medium">
                                            <MerchantTile
                                                imageUrl={imageKey ? photos?.get(imageKey) : undefined}
                                                name={merchant}
                                            />
                                            <span className="truncate">{merchant}</span>
                                        </span>
                                    </Table.Cell>
                                    {selected ? null : (
                                        <Table.Cell className={CELL}>
                                            <span className="flex items-center gap-2">
                                                <LookTile look={catalog.category(row.topId)} size="sm" />
                                                <span className="truncate">{top ? categoryName(top) : ""}</span>
                                            </span>
                                        </Table.Cell>
                                    )}
                                    <Table.Cell className={cn(CELL, "hidden md:table-cell")}>
                                        {row.accountId ? (ledger.accounts.get(row.accountId)?.name ?? "") : ""}
                                    </Table.Cell>
                                    {when}
                                    {selected ? (
                                        <Table.Cell className={cn(CELL, "hidden max-w-48 truncate lg:table-cell")}>
                                            {book?.details ?? ""}
                                        </Table.Cell>
                                    ) : null}
                                    <Table.Cell
                                        align="end"
                                        className={cn("font-mono whitespace-nowrap", row.income && "text-app-income")}
                                    >
                                        {money(row.income ? row.amount : -row.amount, ledger.currency, "always")}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            )}
            {view.pages > 1 ? (
                <div className="text-muted-foreground flex items-center justify-end gap-2 px-5 py-3 text-xs">
                    <span className="tabular-nums">
                        {copy.transactions.range({ from: view.from, to: view.to, total: view.total })}
                    </span>
                    <Button
                        aria-label={copy.transactions.previous.value}
                        disabled={view.page === 0}
                        onClick={() => setPage(view.page - 1)}
                        size="icon-sm"
                        variant="outline"
                    >
                        <HugeiconsIcon className="size-4" icon={Left} />
                    </Button>
                    <Button
                        aria-label={copy.transactions.next.value}
                        disabled={view.page === view.pages - 1}
                        onClick={() => setPage(view.page + 1)}
                        size="icon-sm"
                        variant="outline"
                    >
                        <HugeiconsIcon className="size-4" icon={Right} />
                    </Button>
                </div>
            ) : null}
        </section>
    );
}
