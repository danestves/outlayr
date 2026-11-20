import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/money/ledger-log";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, FeeTile, MerchantTile } from "@/components/ledger/tiles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MenuContent } from "@/components/ui/menu-content";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { isFinanced } from "@/lib/entry-writes";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { photoSrc } from "@/lib/photo-src";
import { parseReceipt } from "@/lib/receipt-scan";

import { useCatalog } from "../home/catalog";
import { timeOfDay, useCategoryName, useDateFormat } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import { useWide } from "../insights/use-wide";
import { EntryEditor, useRepeatNames } from "./entry-form";
import { installmentTags, transferMoves } from "./model";
import { SavedReceipt } from "./receipt-card";
import { TransferEditor } from "./transfer-editor";
import { useWeekday } from "./use-day-title";

const ISO_CURRENCY = /^[A-Z]{3}$/u;
const HUSHED_TARGETS = "input, textarea, select, [contenteditable=true], [role=listbox], [role=menu], .dash-po";

function Line({ children, label, onPress }: { children: ReactNode; label: ReactNode; onPress?: () => void }) {
    const body = (
        <>
            <span className="text-muted-foreground w-24 shrink-0 text-left">{label}</span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">{children}</span>
            {onPress ? (
                <HugeiconsIcon icon={ArrowRight01Icon} className="text-muted-foreground shrink-0" size={18} />
            ) : null}
        </>
    );
    const line = "border-border text-app-body flex min-h-11 w-full items-center gap-3 border-b py-2";
    return onPress ? (
        <button className={line} onClick={onPress} type="button">
            {body}
        </button>
    ) : (
        <div className={line}>{body}</div>
    );
}

function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="bg-muted text-app-micro rounded-app-xs px-1.5 py-0.5 font-mono font-medium">{children}</kbd>;
}

/** The sheet's frame: title, the stepper and more menu beside the close button, then the body and its foot. */
function Chrome({
    body,
    categoryHint,
    foot,
    more,
    onStep,
    title,
}: {
    body: ReactNode;
    categoryHint: boolean;
    foot?: ReactNode;
    more: ReactNode;
    onStep: (by: 1 | -1) => void;
    title: ReactNode;
}) {
    const wide = useWide();
    const { detail } = useIntlayer("dashboard-transactions");
    return (
        <>
            {wide ? (
                <>
                    <Sheet.Close aria-label={detail.hints.close.value} className="absolute end-4 top-4 z-10" />
                    <Sheet.Header className="pe-14" title={title} />
                </>
            ) : (
                <Sheet.Header>
                    <Sheet.Close aria-label={detail.hints.close.value} />
                    <Sheet.Title>{title}</Sheet.Title>
                </Sheet.Header>
            )}
            <div className={`absolute top-4 z-10 flex items-center gap-1 ${wide ? "end-14" : "end-4"}`}>
                {wide ? (
                    <>
                        <Button
                            aria-label={detail.previous.value}
                            onClick={() => onStep(-1)}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <HugeiconsIcon icon={ArrowUp01Icon} size={18} />
                        </Button>
                        <Button aria-label={detail.next.value} onClick={() => onStep(1)} size="icon-sm" variant="ghost">
                            <HugeiconsIcon icon={ArrowDown01Icon} size={18} />
                        </Button>
                    </>
                ) : null}
                {more}
            </div>
            <Sheet.Body className="pt-2">{body}</Sheet.Body>
            {foot ? <Sheet.Footer>{foot}</Sheet.Footer> : null}
            {wide ? (
                <Sheet.Footer className="text-muted-foreground border-border text-app-caption flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t py-3 pointer-coarse:hidden">
                    <span className="flex items-center gap-1">
                        <Kbd>J</Kbd>
                        <Kbd>K</Kbd>
                        {detail.hints.move}
                    </span>
                    {categoryHint ? (
                        <span className="flex items-center gap-1">
                            <Kbd>C</Kbd>
                            {detail.hints.category}
                        </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                        <Kbd>⌫</Kbd>
                        {detail.hints.delete}
                    </span>
                    <span className="flex items-center gap-1">
                        <Kbd>Esc</Kbd>
                        {detail.hints.close}
                    </span>
                </Sheet.Footer>
            ) : null}
        </>
    );
}

function MoreMenu({ id, onDelete, onLogAgain }: { id: string; onDelete: () => void; onLogAgain?: () => void }) {
    const { bulk, detail, form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const copyLink = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/transactions?entry=${id}`);
        toast({ text: detail.copied.value });
    };
    return (
        <Menu>
            <Menu.Trigger aria-label={detail.more.value} render={<Button size="icon-sm" variant="ghost" />}>
                <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
            </Menu.Trigger>
            <MenuContent className="z-60" sideOffset={6}>
                <Menu.Item onClick={copyLink}>
                    <HugeiconsIcon icon={Link01Icon} size={15} />
                    {detail.copyLink}
                </Menu.Item>
                {onLogAgain ? (
                    <Menu.Item onClick={onLogAgain}>
                        <HugeiconsIcon icon={Copy01Icon} size={15} />
                        {form.logAgain}
                    </Menu.Item>
                ) : null}
                <Menu.Separator />
                <Menu.Item onClick={onDelete} variant="destructive">
                    <HugeiconsIcon icon={Delete02Icon} size={15} />
                    {bulk.delete}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

export type EntryStart = "account" | "category" | "edit";

interface EntrySheetProps {
    onClose: () => void;
    onDelete: (row: FoldedRow) => void;
    onStep: (by: 1 | -1) => void;
    row: FoldedRow | null;
    start?: EntryStart;
}

/** One entry or transfer. On a phone it takes the whole screen, and an entry reads first with Edit below. */
export function EntrySheet({ onClose, onDelete, onStep, row, start }: EntrySheetProps) {
    const wide = useWide();
    // The sheet slides out after row clears, and it should carry the entry with it.
    const [shown, setShown] = useState(row);
    const [doomed, setDoomed] = useState<FoldedRow | null>(null);
    if (row && row !== shown) {
        setShown(row);
    }
    return (
        <>
            <DeleteDialog
                onClose={() => setDoomed(null)}
                onDelete={() => {
                    if (doomed) {
                        onDelete(doomed);
                    }
                }}
                row={doomed}
            />
            <Sheet
                onOpenChange={(open) => (open ? undefined : onClose())}
                open={row !== null}
                side={wide ? "right" : "bottom"}
            >
                <Sheet.Content className="app-shell ph-no-capture" showGrabber={false} size={wide ? "auto" : "full"}>
                    {shown ? (
                        <EntryBody
                            key={shown.id}
                            onClose={onClose}
                            onDelete={setDoomed}
                            onStep={onStep}
                            row={shown}
                            start={start}
                        />
                    ) : null}
                </Sheet.Content>
            </Sheet>
        </>
    );
}

function DeleteDialog({
    onClose,
    onDelete,
    row,
}: {
    onClose: () => void;
    onDelete: () => void;
    row: FoldedRow | null;
}) {
    const { ledger } = useDashboard();
    const { confirm: copy } = useIntlayer("dashboard-shell");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const [shown, setShown] = useState(row);
    if (row && row !== shown) {
        setShown(row);
    }
    const body = () => {
        if (!shown) {
            return null;
        }
        const { amount } = figureOf(ledger, shown);
        if ("fromId" in shown) {
            const name = `${ledger.accounts.get(shown.fromId)?.name ?? ""} → ${ledger.accounts.get(shown.toId)?.name ?? ""}`;
            return `${copy.summary({ amount: money(amount, ledger.currency), date: date.day(shown.day), name }).value} ${copy.transfer.value}`;
        }
        const category = ledger.categories.get(shown.topId);
        const name = shown.note.trim() || (category ? categoryName(category) : "");
        const summary = copy.summary({
            amount: money(shown.income ? amount : -amount, ledger.currency, "always"),
            date: date.day(shown.day),
            name,
        }).value;
        const account = shown.accountId === null ? undefined : ledger.accounts.get(shown.accountId)?.name;
        if (account === undefined) {
            return summary;
        }
        const balance = shown.income ? copy.balanceDown({ account }) : copy.balanceUp({ account });
        return `${summary} ${balance.value}`;
    };
    return (
        <ConfirmDialog
            action={copy.delete}
            body={body()}
            cancel={copy.cancel}
            onAction={onDelete}
            onOpenChange={(open) => (open ? undefined : onClose())}
            open={row !== null}
            title={copy.title}
            tone="destructive"
        />
    );
}

// Fees follow their purchase, and installment rows follow their plan's rules, which this form does not know yet.
export function editableDoc(ledger: Ledger, row: Exclude<FoldedRow, { fromId: string }>) {
    const doc = ledger.books.transactions.find((each) => each.localId === row.id);
    return row.feeFor !== null || (doc && isFinanced(ledger.books, doc)) ? undefined : doc;
}

function ReadTop({
    imageUrl,
    merchant,
    row,
    total,
    when,
}: {
    imageUrl: string | undefined;
    merchant: string;
    row: Exclude<FoldedRow, { fromId: string }>;
    total: string;
    when: string;
}) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const standsAlone = row.feeFor !== null;
    const feeTotal = row.fees.reduce((sum, fee) => sum + fee.amount, 0);
    return (
        <>
            <div className="flex items-center gap-3">
                {standsAlone ? <FeeTile /> : <MerchantTile imageUrl={imageUrl} name={merchant} size="xl" />}
                <span className="min-w-0">
                    <span className="text-app-title block truncate font-semibold">{merchant}</span>
                    <span className="text-muted-foreground text-app-label block truncate">{when}</span>
                </span>
            </div>
            <div
                className={`text-app-figure mt-4 font-mono font-semibold tabular-nums ${row.income ? "text-app-income" : ""}`}
            >
                {total}
            </div>
            {feeTotal > 0 ? (
                <div className="text-muted-foreground text-app-caption mt-1 font-mono tabular-nums">
                    {detail.feeOf({
                        amount: money(figureOf(ledger, row).amount - feeTotal, ledger.currency),
                        fee: money(feeTotal, ledger.currency),
                    })}
                </div>
            ) : null}
        </>
    );
}

function RecurringLink({ id }: { id: string }) {
    const { drawer } = useIntlayer("dashboard-ledger");
    return (
        <Link
            className="border-border text-app-body text-app-tint flex min-h-11 items-center justify-end border-b py-2 font-medium"
            search={{ item: id, tab: "all" }}
            to="/recurring"
        >
            {drawer.openRecurring}
        </Link>
    );
}

function InstallmentLine({ installmentId, rowId }: { installmentId: string | null | undefined; rowId: string }) {
    const { ledger } = useDashboard();
    const { detail, installmentOf } = useIntlayer("dashboard-transactions");
    const { drawer } = useIntlayer("dashboard-ledger");
    const tag = installmentId ? installmentTags(ledger.books).get(installmentId) : undefined;
    const planId = ledger.books.installments.find((row) => row.localId === installmentId)?.planId;
    const planned = ledger.books.installmentPlans.some(
        (plan) => plan.deletedAt === null && plan.transactionId === rowId
    );
    return (
        <Line label={detail.installments}>
            <span className="text-muted-foreground">
                {tag ? installmentOf({ at: String(tag.at), of: String(tag.of) }) : null}
                {!tag && !planned ? detail.off : null}
            </span>
            {planId ? (
                <Link className="text-app-tint font-medium" params={{ planId }} to="/installments/$planId">
                    {drawer.openPlan}
                </Link>
            ) : null}
        </Line>
    );
}

function EntryReceipt({ raw }: { raw: ReturnType<ReturnType<typeof useCatalog>["transaction"]> }) {
    const { ledger } = useDashboard();
    const receipt = parseReceipt(raw?.receipt);
    if (!raw || !receipt) {
        return null;
    }
    return <SavedReceipt currency={raw.currency ?? ledger.currency} merchant={raw.note.trim()} receipt={receipt} />;
}

function ReadEntry({
    imageUrl,
    onDelete,
    onEdit,
    onLogAgain,
    raw,
    row,
    total,
    when,
}: {
    imageUrl: string | undefined;
    onDelete: () => void;
    onEdit?: () => void;
    onLogAgain?: () => void;
    raw: ReturnType<ReturnType<typeof useCatalog>["transaction"]>;
    row: Exclude<FoldedRow, { fromId: string }>;
    total: string;
    when: string;
}) {
    const { ledger } = useDashboard();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const words = useIntlayer("dashboard-transactions");
    const { bulk, detail, form } = words;
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const repeatNames = useRepeatNames();
    const top = ledger.categories.get(row.topId);
    const category = row.categoryId
        ? ledger.books.categories.find((each) => each.localId === row.categoryId)
        : undefined;
    const name = top ? categoryName(top) : "";
    const merchant = row.note.trim() || name;
    const standsAlone = row.feeFor !== null;
    const account = ledger.books.accounts.find((each) => each.localId === row.accountId);
    const foreign =
        raw?.currency && raw.currency !== ledger.currency && ISO_CURRENCY.test(raw.currency) ? raw.currency : null;
    const repeat = raw?.recurringType ?? 0;
    return (
        <>
            <ReadTop imageUrl={imageUrl} merchant={merchant} row={row} total={total} when={when} />
            <div className="mt-3">
                <Line label={copy.columns.category} onPress={onEdit}>
                    {standsAlone ? (
                        <span className="text-muted-foreground">{raw?.feeForId ? copy.cardFee : copy.transferFee}</span>
                    ) : (
                        <>
                            <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: top?.color }}
                            />
                            <span className="truncate font-medium">
                                {name}
                                {category?.name && category.localId !== top?.id
                                    ? ` · ${categoryName({ id: category.localId, name: category.name })}`
                                    : ""}
                            </span>
                        </>
                    )}
                </Line>
                <Line label={copy.columns.account} onPress={onEdit}>
                    {account ? <AccountTile account={accountLook(account)} size="sm" /> : null}
                    <span className="truncate font-medium">{account?.name ?? copy.noAccount}</span>
                </Line>
                <Line label={form.currency} onPress={onEdit}>
                    <span className="font-medium">{raw?.currency ?? ledger.currency}</span>
                </Line>
                {foreign && raw ? (
                    <Line label={detail.charged}>
                        <span className="font-mono tabular-nums">{money(raw.amount, foreign)}</span>
                    </Line>
                ) : null}
                <Line label={form.repeat} onPress={onEdit}>
                    <span className="text-muted-foreground">
                        {Object.entries(repeatNames).find(([type]) => Number(type) === repeat)?.[1] ?? repeatNames[0]}
                    </span>
                </Line>
                {repeat > 0 ? <RecurringLink id={row.id} /> : null}
                <InstallmentLine installmentId={raw?.installmentId} rowId={row.id} />
                {raw?.details?.trim() ? (
                    <Line label={detail.note}>
                        <span className="text-muted-foreground">{raw.details}</span>
                    </Line>
                ) : null}
            </div>
            <EntryReceipt raw={raw} />
            <div className="mt-5 flex flex-col gap-2 pb-4">
                <div className="flex gap-2 *:flex-1">
                    {onLogAgain ? (
                        <Button onClick={onLogAgain} variant="outline">
                            <HugeiconsIcon icon={Copy01Icon} size={15} />
                            {form.logAgain}
                        </Button>
                    ) : null}
                    <Button onClick={onDelete} variant="outline">
                        <HugeiconsIcon icon={Delete02Icon} size={15} />
                        {bulk.delete}
                    </Button>
                </div>
                {onEdit ? (
                    <Button onClick={onEdit} size="lg">
                        {detail.edit}
                    </Button>
                ) : (
                    <p className="text-muted-foreground text-app-label">{detail.editOnPhone}</p>
                )}
            </div>
        </>
    );
}

function useSheetKeys(
    onDelete: () => void,
    onStep: (by: 1 | -1) => void,
    categoryTrigger: RefObject<HTMLButtonElement | null>
) {
    const onKeyEvent = useEffectEvent((event: KeyboardEvent) => {
        if (
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            (event.target instanceof Element && event.target.closest(HUSHED_TARGETS))
        ) {
            return;
        }
        if (event.key === "Delete" || event.key === "Backspace") {
            onDelete();
        } else if (event.key === "c") {
            event.preventDefault();
            categoryTrigger.current?.click();
        } else if (event.key === "j" || event.key === "k") {
            onStep(event.key === "j" ? 1 : -1);
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- the keyboard is an external system.
    useEffect(() => {
        document.addEventListener("keydown", onKeyEvent);
        return () => document.removeEventListener("keydown", onKeyEvent);
    }, []);
}

function useOpenedPicker(trigger: RefObject<HTMLButtonElement | null> | null) {
    const openPicker = useEffectEvent(async (isLive: () => boolean) => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const animations = trigger?.current?.closest("[role=dialog]")?.getAnimations() ?? [];
        await Promise.allSettled(animations.map((animation) => animation.finished));
        if (isLive()) {
            trigger?.current?.click();
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- a picker measured mid-slide lands off its trigger.
    useEffect(() => {
        let live = true;
        void openPicker(() => live);
        return () => {
            live = false;
        };
    }, []);
}

function EntryBody({ onClose, onDelete, onStep, row, start }: Omit<EntrySheetProps, "row"> & { row: FoldedRow }) {
    const { ledger } = useDashboard();
    const { open } = useAccountFlows();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const { detail, form } = useIntlayer("dashboard-transactions");
    const wide = useWide();
    const weekday = useWeekday();
    const { clockTime, money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const raw = "fromId" in row ? undefined : catalog.transaction(row.id);
    const figure = figureOf(ledger, row);
    const accountTrigger = useRef<HTMLButtonElement>(null);
    const categoryTrigger = useRef<HTMLButtonElement>(null);
    const [editing, setEditing] = useState(start !== undefined);
    const remove = () => onDelete(row);
    useSheetKeys(remove, onStep, categoryTrigger);
    const pickers = { account: accountTrigger, category: categoryTrigger };
    useOpenedPicker(start === undefined || start === "edit" ? null : pickers[start]);
    const time = clockTime(timeOfDay(row.at, ledger.offsetAt(row.at)));
    const when = `${weekday(row.day)}, ${time}`;
    if ("fromId" in row) {
        return (
            <Chrome
                body={<TransferBody onDelete={remove} row={row} />}
                categoryHint={false}
                more={<MoreMenu id={row.id} onDelete={remove} />}
                onStep={onStep}
                title={copy.transfer}
            />
        );
    }
    const doc = editableDoc(ledger, row);
    const imageUrl = photoSrc(raw?.imageKey);
    const total = money(row.income ? figure.amount : -figure.amount, ledger.currency, "always");
    const logAgain = doc
        ? () => {
              onClose();
              open({ from: row.id, kind: "entry" });
          }
        : undefined;
    const more = <MoreMenu id={row.id} onDelete={remove} onLogAgain={logAgain} />;
    if (doc && (wide || editing)) {
        return (
            <Chrome
                body={
                    <>
                        <EntryEditor
                            accountTrigger={accountTrigger}
                            categoryTrigger={categoryTrigger}
                            doc={doc}
                            imageUrl={imageUrl}
                            key={doc.localId}
                            onDelete={remove}
                            onLogAgain={() => logAgain?.()}
                            total={total}
                        />
                        {(raw?.recurringType ?? 0) > 0 ? <RecurringLink id={row.id} /> : null}
                        <EntryReceipt raw={raw} />
                    </>
                }
                categoryHint
                foot={
                    wide ? undefined : (
                        <Button onClick={() => setEditing(false)} size="lg">
                            {detail.done}
                        </Button>
                    )
                }
                more={more}
                onStep={onStep}
                title={form.title}
            />
        );
    }
    return (
        <Chrome
            body={
                <ReadEntry
                    imageUrl={imageUrl}
                    onDelete={remove}
                    onEdit={doc ? () => setEditing(true) : undefined}
                    onLogAgain={logAgain}
                    raw={raw}
                    row={row}
                    total={total}
                    when={when}
                />
            }
            categoryHint={false}
            more={more}
            onStep={onStep}
            title={form.title}
        />
    );
}

function TransferBody({ onDelete, row }: { onDelete: () => void; row: Extract<FoldedRow, { fromId: string }> }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const doc = ledger.books.transfers.find((each) => each.localId === row.id);
    if (!doc) {
        return null;
    }
    const moves = transferMoves(row, ledger.currency);
    const side = (id: string | null) => {
        const look = id === null ? null : catalog.account(id);
        return (
            <span className="text-foreground flex items-center gap-2 font-medium whitespace-nowrap">
                {look ? <AccountTile account={look} size="md" /> : null}
                {id === null ? "" : ledger.accounts.get(id)?.name}
            </span>
        );
    };
    return (
        <TransferEditor doc={doc} key={doc.localId} onDelete={onDelete}>
            <div className="text-muted-foreground text-app-caption mt-6 mb-1 font-medium">{detail.moves}</div>
            <div className="border-border border-t">
                <Line label={side(row.fromId)}>
                    <span className="font-mono tabular-nums">{money(-moves.sent, row.sentCurrency, "always")}</span>
                </Line>
                <Line label={side(row.toId)}>
                    <span className="font-mono tabular-nums">{money(row.arrived, row.arrivedCurrency, "always")}</span>
                </Line>
                {moves.apart.map((fee) => (
                    <Line key={fee.id} label={detail.fee}>
                        <span className="font-mono tabular-nums">{money(-fee.amount, ledger.currency, "always")}</span>
                    </Line>
                ))}
            </div>
        </TransferEditor>
    );
}
