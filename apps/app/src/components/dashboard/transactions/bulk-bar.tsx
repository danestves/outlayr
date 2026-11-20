import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import HashtagIcon from "@hugeicons/core-free-icons/HashtagIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Toolbar } from "panelui-web/toolbar";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MenuContent } from "@/components/ui/menu-content";
import { bulkEdited, toAccount, toCategory } from "@/lib/bulk-writes";
import type { BulkChange } from "@/lib/bulk-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { useTagBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { createdTag, findTag, linkRows, normalizeTagName, TAG_NAME_LIMIT } from "@/lib/rule-writes";

import type { FoldedRow } from "../home/rows";
import { merchantOf, useCategoryOptions } from "./entry-form";
import { tally } from "./model";
import { entryNotices } from "./use-delete";
import type { LedgerList } from "./use-ledger-list";

const ACTION = "text-foreground text-app-label gap-1.5 px-2.5 font-medium whitespace-nowrap";
const LIST = "max-h-80 overflow-y-auto";
const nowMs = () => Date.now();

function TagAction({ ids, list }: { ids: readonly string[]; list: LedgerList }) {
    const committer = useLedgerCommitter(entryNotices);
    const tagBooks = useTagBooks();
    const { bulk } = useIntlayer("dashboard-ledger");
    const { form } = useIntlayer("dashboard-transactions");
    const [needle, setNeedle] = useState("");
    const name = normalizeTagName(needle).slice(0, TAG_NAME_LIMIT);
    const shown = list.tags.filter((tag) => tag.name.toLocaleLowerCase().includes(name.toLocaleLowerCase()));
    const fresh = name !== "" && findTag(list.tags, name) === undefined;
    const tagWith = (tagId: string, tagName: string, created: boolean) => {
        const at = nowMs();
        const links = linkRows(
            tagBooks.links,
            ids.map((id) => ({ entry: { id }, tagIds: [tagId] })),
            at
        );
        void committer.commit([...(created ? [createdTag(tagId, tagName, at)] : []), ...links], {
            failed: form.saveFailed.value,
            saved: bulk.tagged({ count: String(ids.length), name: tagName }).value,
        });
        setNeedle("");
    };
    return (
        <Menu onOpenChange={(open) => (open ? null : setNeedle(""))}>
            <Menu.Trigger render={<Toolbar.Button className={ACTION} />}>
                <HugeiconsIcon icon={HashtagIcon} size={14} strokeWidth={2} />
                {bulk.addTag}
            </Menu.Trigger>
            <MenuContent className="w-60" side="top" sideOffset={8}>
                <Input
                    aria-label={bulk.searchTags.value}
                    autoFocus
                    className="mb-1.5"
                    maxLength={TAG_NAME_LIMIT}
                    onChange={(event) => setNeedle(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && fresh) {
                            tagWith(crypto.randomUUID(), name, true);
                        }
                        if (event.key !== "Escape" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                            event.stopPropagation();
                        }
                    }}
                    placeholder={bulk.searchTags.value}
                    value={needle}
                />
                <div className={LIST}>
                    {shown.map((tag) => (
                        <Menu.Item key={tag.localId} onClick={() => tagWith(tag.localId, tag.name, false)}>
                            <span className="text-muted-foreground font-mono">#</span>
                            {tag.name}
                        </Menu.Item>
                    ))}
                    {fresh ? (
                        <Menu.Item onClick={() => tagWith(crypto.randomUUID(), name, true)}>
                            {bulk.createTag({ name })}
                        </Menu.Item>
                    ) : null}
                </div>
            </MenuContent>
        </Menu>
    );
}

interface BulkBarProps {
    list: LedgerList;
    onClear: () => void;
    onDelete: () => void;
    picked: readonly FoldedRow[];
}

export function BulkBar({ list, onClear, onDelete, picked }: BulkBarProps) {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter(entryNotices);
    const words = useIntlayer("dashboard-ledger");
    const { bulk, form } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const expense = useCategoryOptions(ledger, false);
    const income = useCategoryOptions(ledger, true);
    const [confirming, setConfirming] = useState(false);
    const entries = picked.flatMap((row) => ("fromId" in row ? [] : [row]));
    const ids = entries.map((row) => row.id);
    const kinds = new Set(entries.map((row) => row.income));
    const totals = tally(ledger, picked);
    const count = String(picked.length);
    const apply = (change: BulkChange) => {
        const current = committer.current();
        const edited = bulkEdited(
            current,
            ids,
            change,
            (values) => form.feeNote({ merchant: merchantOf(current, values) }).value
        );
        const counts = { count: String(edited.count), skipped: String(edited.skipped) };
        void committer.commit(edited.rows, {
            failed: form.saveFailed.value,
            saved: edited.skipped === 0 ? bulk.updated(counts).value : bulk.updatedSkipped(counts).value,
        });
    };
    const categories = [
        ...(kinds.has(false) ? expense.map((option) => ({ ...option, income: false })) : []),
        ...(kinds.has(true) ? income.map((option) => ({ ...option, income: true })) : []),
    ];
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-21 z-20 flex justify-center px-4">
            <Toolbar
                aria-label={bulk.selected({ count }).value}
                className="pointer-events-auto shadow-(--shadow-app-popover)"
            >
                <span className="text-app-label ps-2.5 pe-1 font-medium whitespace-nowrap">
                    {bulk.selected({ count })}
                </span>
                <span className="text-muted-foreground text-app-label pe-1 font-mono whitespace-nowrap tabular-nums">
                    {money(totals.in - totals.out, ledger.currency, "always")}
                </span>
                <Toolbar.Separator />
                {ids.length > 0 ? (
                    <>
                        <Menu>
                            <Menu.Trigger render={<Toolbar.Button className={ACTION} />}>
                                <HugeiconsIcon icon={Tag01Icon} size={14} strokeWidth={2} />
                                {words.bulk.setCategory}
                            </Menu.Trigger>
                            <MenuContent className={LIST} side="top" sideOffset={8}>
                                {categories.map((option) => (
                                    <Menu.Item
                                        key={option.value}
                                        onClick={() => apply(toCategory(option.value, option.income))}
                                    >
                                        {option.icon}
                                        {option.label}
                                    </Menu.Item>
                                ))}
                            </MenuContent>
                        </Menu>
                        <Menu>
                            <Menu.Trigger render={<Toolbar.Button className={ACTION} />}>
                                <HugeiconsIcon icon={CreditCardIcon} size={14} strokeWidth={2} />
                                {words.bulk.setAccount}
                            </Menu.Trigger>
                            <MenuContent className={LIST} side="top" sideOffset={8}>
                                {openAccounts(ledger.books).map((row) => (
                                    <Menu.Item key={row.localId} onClick={() => apply(toAccount(row.localId))}>
                                        <AccountTile account={accountLook(row)} size="sm" />
                                        {row.name}
                                    </Menu.Item>
                                ))}
                            </MenuContent>
                        </Menu>
                        <TagAction ids={ids} list={list} />
                    </>
                ) : null}
                <Toolbar.Button className={ACTION} onClick={() => setConfirming(true)}>
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                    {words.bulk.delete}
                </Toolbar.Button>
                <Toolbar.Separator />
                <Toolbar.Button label={bulk.clear.value} onClick={onClear}>
                    <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                </Toolbar.Button>
            </Toolbar>
            <ConfirmDialog
                action={words.bulk.delete}
                body={words.bulk.deleteBody}
                cancel={words.bulk.cancel}
                onAction={() => {
                    setConfirming(false);
                    onDelete();
                }}
                onOpenChange={setConfirming}
                open={confirming}
                title={words.bulk.deleteTitle({ count })}
                tone="destructive"
            />
        </div>
    );
}
