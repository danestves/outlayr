import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Menu } from "panelui-web/menu";
import { Toolbar } from "panelui-web/toolbar";
import { useRef } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { bulkEdited, toAccount, toCategory, toDay } from "@/lib/bulk-writes";
import type { BulkChange } from "@/lib/bulk-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";

import { merchantOf, useCategoryOptions } from "./entry-form";
import { entryNotices } from "./use-delete";

const LIST = "app-shell ph-no-capture z-[60] max-h-80 overflow-y-auto";

/** Category, Account and Date for the picked entries, which stay picked so another action can follow. */
export function BulkActions({ className, ids, kinds }: { className: string; ids: string[]; kinds: boolean[] }) {
    const { ledger, photos } = useDashboard();
    const committer = useLedgerCommitter(entryNotices);
    const { bulk, form } = useIntlayer("dashboard-transactions");
    const dayInput = useRef<HTMLInputElement>(null);
    const expense = useCategoryOptions(ledger, false);
    const income = useCategoryOptions(ledger, true);
    const apply = (change: BulkChange) => {
        const current = committer.current();
        const { count, rows, skipped } = bulkEdited(
            current,
            ids,
            change,
            (values) => form.feeNote({ merchant: merchantOf(current, values) }).value
        );
        const counts = { count: String(count), skipped: String(skipped) };
        void committer.commit(rows, {
            failed: form.saveFailed.value,
            saved: skipped === 0 ? bulk.updated(counts).value : bulk.updatedSkipped(counts).value,
        });
    };
    const categories = [
        ...(kinds.includes(false) ? expense.map((option) => ({ ...option, income: false })) : []),
        ...(kinds.includes(true) ? income.map((option) => ({ ...option, income: true })) : []),
    ];
    return (
        <>
            <Menu>
                <Menu.Trigger render={<Toolbar.Button className={className} />}>
                    <HugeiconsIcon icon={Tag01Icon} size={14} />
                    {form.category}
                </Menu.Trigger>
                <Menu.Content className={LIST} sideOffset={6}>
                    {categories.map((option) => (
                        <Menu.Item key={option.value} onClick={() => apply(toCategory(option.value, option.income))}>
                            {option.icon}
                            {option.label}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu>
            <Menu>
                <Menu.Trigger render={<Toolbar.Button className={className} />}>
                    <HugeiconsIcon icon={CreditCardIcon} size={14} />
                    {form.account}
                </Menu.Trigger>
                <Menu.Content className={LIST} sideOffset={6}>
                    {openAccounts(ledger.books).map((row) => (
                        <Menu.Item key={row.localId} onClick={() => apply(toAccount(row.localId))}>
                            <AccountTile account={accountLook(row)} photos={photos} size="sm" />
                            {row.name}
                        </Menu.Item>
                    ))}
                </Menu.Content>
            </Menu>
            <span className="relative">
                <Toolbar.Button className={className} onClick={() => dayInput.current?.showPicker()}>
                    <HugeiconsIcon icon={Calendar03Icon} size={14} />
                    {form.date}
                </Toolbar.Button>
                <input
                    aria-label={form.date.value}
                    className="pointer-events-none absolute inset-0 opacity-0 pointer-coarse:pointer-events-auto"
                    onChange={(event) => {
                        const day = event.target.value;
                        if (day !== "") {
                            apply(toDay(day));
                            event.target.value = "";
                        }
                    }}
                    ref={dayInput}
                    tabIndex={-1}
                    type="date"
                />
            </span>
        </>
    );
}
