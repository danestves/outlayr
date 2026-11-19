import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Command } from "panelui-web/command";
import { useDeferredValue, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { categoryTone, titled, useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";
import { photoSrc } from "@/lib/photo-src";

import { setPaletteOpen, usePaletteOpen } from "./palette-open";

const ENTRY_LIMIT = 5;
const GROUP_LIMIT = 3;

const itemIcon = (icon: IconSvgElement) => (
    <span className="bg-app-fill text-muted-foreground rounded-app-xs flex size-6 items-center justify-center">
        <HugeiconsIcon icon={icon} size={14} strokeWidth={1.5} />
    </span>
);

interface Found {
    accounts: { id: string; name: string }[];
    categories: { color: string; id: string; name: string; spent: number }[];
    entries: { details: string; name: string; row: LedgerRow }[];
    merchants: { count: number; name: string; total: number }[];
}

export function paletteResults(
    ledger: Ledger,
    needle: string,
    names: { category: (id: string) => string; details: (id: string) => string }
): Found {
    const has = (text: string) => text.toLocaleLowerCase().includes(needle);
    const entries: Found["entries"] = [];
    const merchants = new Map<string, Found["merchants"][number]>();
    for (let index = ledger.rows.length - 1; index >= 0; index -= 1) {
        const row = ledger.rows[index];
        if (!row || row.feeFor !== null) {
            continue;
        }
        const name = row.note.trim() || names.category(row.topId);
        const details = names.details(row.id);
        if (entries.length < ENTRY_LIMIT && (has(name) || has(details))) {
            entries.push({ details: has(name) ? "" : details, name, row });
        }
        const merchant = row.note.trim();
        if (merchant !== "" && has(merchant)) {
            const key = merchant.toLocaleLowerCase();
            const seen = merchants.get(key) ?? { count: 0, name: merchant, total: 0 };
            merchants.set(key, { ...seen, count: seen.count + 1, total: seen.total + row.amount });
        }
    }
    const spent = (id: string) =>
        (ledger.expensesByCategory.get(id) ?? []).reduce((sum, expense) => sum + expense.amount, 0);
    const categories = [...ledger.categories.values()]
        .filter((category) => has(names.category(category.id)))
        .slice(0, GROUP_LIMIT)
        .map((category) => ({
            color: category.color,
            id: category.id,
            name: names.category(category.id),
            spent: spent(category.id),
        }));
    const accounts = openAccounts(ledger.books)
        .filter((row) => has(row.name))
        .slice(0, GROUP_LIMIT)
        .map((row) => ({ id: row.localId, name: row.name }));
    return { accounts, categories, entries, merchants: [...merchants.values()].slice(0, GROUP_LIMIT) };
}

function Marked({ needle, text }: { needle: string; text: string }) {
    const at = needle === "" ? -1 : text.toLocaleLowerCase().indexOf(needle);
    if (at === -1) {
        return text;
    }
    return (
        <>
            {text.slice(0, at)}
            <mark className="text-app-tint bg-transparent">{text.slice(at, at + needle.length)}</mark>
            {text.slice(at + needle.length)}
        </>
    );
}

function Figures({ children }: { children: ReactNode }) {
    return <span className="dash-figure text-muted-foreground ml-auto flex shrink-0 gap-3 ps-3">{children}</span>;
}

const action = (icon: IconSvgElement, label: string, run: () => void) => (
    <Command.Item icon={itemIcon(icon)} key={label} onSelect={run} value={label}>
        {label}
    </Command.Item>
);

export function CommandPalette() {
    const open = usePaletteOpen();
    const [search, setSearch] = useState("");
    const query = useDeferredValue(search);
    const { ledger } = useDashboard();
    const flows = useAccountFlows();
    const navigate = useNavigate();
    const { locale } = useLocale();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const { add, account, nav } = useIntlayer("dashboard");
    const { palette: copy } = useIntlayer("dashboard-shell");
    const needle = query.trim().toLocaleLowerCase();
    const transactions = useMemo(
        () => new Map(ledger.books.transactions.map((row) => [row.localId, row])),
        [ledger.books.transactions]
    );
    const found = useMemo(() => {
        if (needle === "") {
            return null;
        }
        return paletteResults(ledger, needle, {
            category: (id) => {
                const name = ledger.categories.get(id)?.name;
                return name ? titled(name, locale) : "";
            },
            details: (id) => transactions.get(id)?.details ?? "",
        });
    }, [ledger, locale, needle, transactions]);
    const count = found
        ? found.entries.length + found.merchants.length + found.categories.length + found.accounts.length
        : 0;
    const close = () => {
        setPaletteOpen(false);
        setSearch("");
    };
    const seeAll = () => {
        close();
        void navigate({ search: (prev) => ({ accounts: prev.accounts, q: query.trim() }), to: "/transactions" });
    };
    const addEntry = (note?: string) => {
        close();
        flows.open({ kind: "entry", note });
    };
    const go = (icon: IconSvgElement, label: string, to: "/budgets" | "/import" | "/settings" | "/transactions") =>
        action(icon, label, () => {
            close();
            void navigate({ to });
        });
    return (
        <Command.Dialog
            className="app-shell ph-no-capture app-palette transition-none"
            hotkey="mod+k"
            label={copy.label.value}
            onOpenChange={(next) => (next ? setPaletteOpen(true) : close())}
            open={open}
        >
            <Command filter={false} label={copy.label.value} onSearchChange={setSearch} search={search}>
                <Command.Input placeholder={copy.placeholder.value}>
                    <Command.Keys className="pointer-coarse:hidden" keys={["esc"]} />
                </Command.Input>
                <Command.List>
                    {found === null ? (
                        <>
                            <Command.Group heading={copy.actions}>
                                {action(Add01Icon, add.entry.value, () => addEntry())}
                                {action(ArrowDataTransferHorizontalIcon, copy.addTransfer.value, () => {
                                    close();
                                    flows.open({ kind: "transfer" });
                                })}
                                {go(Upload04Icon, nav.import.value, "/import")}
                            </Command.Group>
                            <Command.Group heading={copy.goTo}>
                                {go(TransactionHistoryIcon, nav.transactions.value, "/transactions")}
                                {go(PieChartIcon, nav.budgets.value, "/budgets")}
                                {go(Settings02Icon, account.settings.value, "/settings")}
                            </Command.Group>
                        </>
                    ) : (
                        <>
                            {found.entries.length > 0 ? (
                                <Command.Group heading={copy.entries}>
                                    {found.entries.map(({ details, name, row }) => (
                                        <Command.Item
                                            icon={
                                                <MerchantTile
                                                    imageUrl={photoSrc(transactions.get(row.id)?.imageKey)}
                                                    name={name}
                                                    size="md"
                                                />
                                            }
                                            key={row.id}
                                            onSelect={() => {
                                                close();
                                                void navigate({
                                                    search: (prev) => ({ accounts: prev.accounts, entry: row.id }),
                                                    to: "/transactions",
                                                    viewTransition: viewTransition("push-left"),
                                                });
                                            }}
                                            subtitle={
                                                details === "" ? (
                                                    <Marked
                                                        needle={needle}
                                                        text={ledger.categories.get(row.topId)?.name ?? ""}
                                                    />
                                                ) : (
                                                    <>
                                                        {copy.note} <Marked needle={needle} text={details} />
                                                    </>
                                                )
                                            }
                                            value={`entry-${row.id}`}
                                        >
                                            <Marked needle={needle} text={name} />
                                            <Figures>
                                                <span>{date.day(row.day)}</span>
                                                <span className="text-foreground">
                                                    {money(row.income ? row.amount : -row.amount, ledger.currency)}
                                                </span>
                                            </Figures>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ) : null}
                            {found.merchants.length > 0 ? (
                                <Command.Group heading={copy.merchants}>
                                    {found.merchants.map((merchant) => (
                                        <Command.Item
                                            icon={itemIcon(Store01Icon)}
                                            key={merchant.name}
                                            onSelect={() => {
                                                close();
                                                void navigate({
                                                    search: (prev) => ({ accounts: prev.accounts, q: merchant.name }),
                                                    to: "/transactions",
                                                });
                                            }}
                                            value={`merchant-${merchant.name}`}
                                        >
                                            <Marked needle={needle} text={merchant.name} />
                                            <Figures>
                                                <span>
                                                    {merchant.count === 1
                                                        ? copy.entryOne
                                                        : copy.entryCount({ count: merchant.count })}
                                                </span>
                                                <span className="text-foreground">
                                                    {money(merchant.total, ledger.currency)}
                                                </span>
                                            </Figures>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ) : null}
                            {found.categories.length > 0 ? (
                                <Command.Group heading={copy.categories}>
                                    {found.categories.map((category) => (
                                        <Command.Item
                                            icon={
                                                <span className="flex size-6 items-center justify-center">
                                                    <span
                                                        className="size-2 rounded-full bg-(--pu-color)"
                                                        style={categoryTone(category.color)}
                                                    />
                                                </span>
                                            }
                                            key={category.id}
                                            onSelect={() => {
                                                close();
                                                void navigate({
                                                    search: (prev) => ({
                                                        accounts: prev.accounts,
                                                        category: category.id,
                                                    }),
                                                    to: "/transactions",
                                                });
                                            }}
                                            value={`category-${category.id}`}
                                        >
                                            <Marked needle={needle} text={category.name} />
                                            <Figures>
                                                <span className="text-foreground">
                                                    {money(category.spent, ledger.currency)}
                                                </span>
                                            </Figures>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ) : null}
                            {found.accounts.length > 0 ? (
                                <Command.Group heading={nav.accounts}>
                                    {found.accounts.map((row) => {
                                        const books = ledger.books.accounts.find((each) => each.localId === row.id);
                                        return (
                                            <Command.Item
                                                icon={
                                                    books ? (
                                                        <AccountTile account={accountLook(books)} size="md" />
                                                    ) : null
                                                }
                                                key={row.id}
                                                onSelect={() => {
                                                    close();
                                                    void navigate({
                                                        params: { accountId: row.id },
                                                        to: "/accounts/$accountId",
                                                        viewTransition: viewTransition("push-left"),
                                                    });
                                                }}
                                                value={`account-${row.id}`}
                                            >
                                                <Marked needle={needle} text={row.name} />
                                            </Command.Item>
                                        );
                                    })}
                                </Command.Group>
                            ) : null}
                            <Command.Empty className="flex flex-col items-center gap-1 py-10">
                                <span className="bg-app-fill text-muted-foreground rounded-app-md mb-2 flex size-10 items-center justify-center">
                                    <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
                                </span>
                                <span className="text-app-label text-foreground font-semibold">{copy.noMatches}</span>
                                <span className="text-app-caption text-muted-foreground">
                                    {copy.noEntry({ query: query.trim() })}
                                </span>
                                <Button className="mt-3" onClick={() => addEntry(query.trim())} variant="outline">
                                    <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} />
                                    {copy.addAs({ query: query.trim() })}
                                </Button>
                            </Command.Empty>
                        </>
                    )}
                </Command.List>
                <Command.Footer
                    lead={
                        <span className="flex items-center gap-3 pointer-coarse:hidden">
                            <span className="flex items-center gap-1.5">
                                <Command.Keys keys={["↑", "↓"]} />
                                {copy.move}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Command.Keys keys={["↵"]} />
                                {copy.open}
                            </span>
                        </span>
                    }
                >
                    {count > 0 ? (
                        <Command.FooterAction onClick={seeAll}>
                            <span className="dash-figure">
                                {count === 1 ? copy.resultOne : copy.resultCount({ count })}
                            </span>
                            · {copy.seeAll}
                        </Command.FooterAction>
                    ) : null}
                </Command.Footer>
            </Command>
        </Command.Dialog>
    );
}
