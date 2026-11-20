import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import SquareArrowUpRightIcon from "@hugeicons/core-free-icons/SquareArrowUpRightIcon";
import TickDouble02Icon from "@hugeicons/core-free-icons/TickDouble02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { MenuContent } from "@/components/ui/menu-content";
import { nextRow } from "@/lib/account-writes";
import { bulkEdited, toCategory } from "@/lib/bulk-writes";
import type { LedgerRow } from "@/lib/dashboard-series-ledger";

import type { FoldedRow } from "../home/rows";
import { merchantOf, useCategoryOptions } from "./entry-form";
import { entryNotices } from "./use-delete";

export function useRowWrites() {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter(entryNotices);
    const { form } = useIntlayer("dashboard-transactions");
    const { review, row: words } = useIntlayer("dashboard-ledger");
    const docs = new Map(ledger.books.transactions.map((doc) => [doc.localId, doc]));
    const reviewed = (ids: readonly string[]) => {
        const at = Date.now();
        const rows = ids.flatMap((id) => {
            const doc = docs.get(id);
            return doc ? [nextRow("transactions", doc, { unreviewed: false }, at)] : [];
        });
        if (rows.length > 0) {
            void committer.commit(rows, {
                failed: form.saveFailed.value,
                saved: review.marked({ count: String(rows.length) }).value,
            });
        }
    };
    const duplicate = (id: string) => {
        const doc = docs.get(id);
        if (doc) {
            const copy = nextRow("transactions", doc, { unreviewed: false }, Date.now());
            void committer.commit([{ ...copy, localId: crypto.randomUUID(), restoredAt: null }], {
                failed: form.saveFailed.value,
                saved: words.duplicated.value,
            });
        }
    };
    const categorize = (row: LedgerRow, categoryId: string) => {
        const current = committer.current();
        const edited = bulkEdited(
            current,
            [row.id],
            toCategory(categoryId, row.income),
            (values) => form.feeNote({ merchant: merchantOf(current, values) }).value
        );
        void committer.commit(edited.rows, { failed: form.saveFailed.value });
    };
    return { categorize, duplicate, reviewed };
}

export type RowWrites = ReturnType<typeof useRowWrites>;

interface RowMenuProps {
    name: string;
    onDelete: () => void;
    onOpen: () => void;
    reviewing: boolean;
    row: FoldedRow;
    writes: RowWrites;
}

export function RowMenu({ name, onDelete, onOpen, reviewing, row, writes }: RowMenuProps) {
    const { review, row: words } = useIntlayer("dashboard-ledger");
    const entry = !("fromId" in row);
    return (
        <Menu>
            <Menu.Trigger
                aria-label={words.menu({ name }).value}
                render={
                    <Button
                        className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            </Menu.Trigger>
            <MenuContent align="end" className="w-52" sideOffset={4}>
                <Menu.Item onClick={onOpen}>
                    <HugeiconsIcon icon={SquareArrowUpRightIcon} strokeWidth={2} />
                    {words.open}
                </Menu.Item>
                {entry ? (
                    <Menu.Item onClick={() => writes.duplicate(row.id)}>
                        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
                        {words.duplicate}
                    </Menu.Item>
                ) : null}
                {reviewing ? (
                    <Menu.Item onClick={() => writes.reviewed([row.id])}>
                        <HugeiconsIcon icon={TickDouble02Icon} strokeWidth={2} />
                        {review.mark}
                    </Menu.Item>
                ) : null}
                <Menu.Separator />
                <Menu.Item onClick={onDelete} variant="destructive">
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    {words.delete}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

export function CategoryPicker({ children, row, writes }: { children: ReactNode; row: LedgerRow; writes: RowWrites }) {
    const { ledger } = useDashboard();
    const { filters } = useIntlayer("dashboard-ledger");
    const options = useCategoryOptions(ledger, row.income);
    const [needle, setNeedle] = useState("");
    const query = needle.trim().toLocaleLowerCase();
    return (
        <Menu onOpenChange={(open) => (open ? null : setNeedle(""))}>
            <Menu.Trigger className="rounded-app-sm focus-visible:ring-ring/30 relative z-1 flex max-w-full min-w-0 outline-none focus-visible:ring-3">
                {children}
            </Menu.Trigger>
            <MenuContent align="start" className="w-64" sideOffset={4}>
                <Input.Group className="mb-1.5">
                    <Input.Addon>
                        <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={2} />
                    </Input.Addon>
                    <Input
                        aria-label={filters.category.value}
                        autoFocus
                        onChange={(event) => setNeedle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== "Escape" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                                event.stopPropagation();
                            }
                        }}
                        placeholder={filters.category.value}
                        value={needle}
                    />
                </Input.Group>
                <div className="max-h-72 overflow-y-auto">
                    {options
                        .filter((option) => option.label.toLocaleLowerCase().includes(query))
                        .map((option) => (
                            <Menu.Item key={option.value} onClick={() => writes.categorize(row, option.value)}>
                                {option.icon}
                                {option.label}
                            </Menu.Item>
                        ))}
                </div>
            </MenuContent>
        </Menu>
    );
}
