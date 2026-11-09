import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, FeeTile, MerchantTile } from "@/components/ledger/tiles";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "../home/catalog";
import { timeOfDay, useCategoryName } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import { useWide } from "../insights/use-wide";
import { EntryEditor, useRepeatNames } from "./entry-form";
import { installmentTags, transferMoves } from "./model";
import { useWeekday } from "./use-day-title";

const ISO_CURRENCY = /^[A-Z]{3}$/u;
const RATE_DIGITS = 2;
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
    const line = "border-border flex min-h-11 w-full items-center gap-3 border-b py-2 text-sm";
    return onPress ? (
        <button className={line} onClick={onPress} type="button">
            {body}
        </button>
    ) : (
        <div className={line}>{body}</div>
    );
}

function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className="bg-muted dash-figure rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium">{children}</kbd>
    );
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
                <Sheet.Header title={title} />
            ) : (
                <Sheet.Header>
                    <Sheet.Close />
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
                <Sheet.Footer className="text-muted-foreground border-border flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t py-3 text-xs pointer-coarse:hidden">
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

function MoreMenu({ onDelete, onLogAgain }: { onDelete: () => void; onLogAgain?: () => void }) {
    const { bulk, detail, form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const copyLink = async () => {
        await navigator.clipboard.writeText(window.location.href);
        toast({ text: detail.copied.value });
    };
    return (
        <Menu>
            <Menu.Trigger aria-label={detail.more.value} render={<Button size="icon-sm" variant="ghost" />}>
                <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture z-[60]" sideOffset={6}>
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
            </Menu.Content>
        </Menu>
    );
}

interface EntrySheetProps {
    onClose: () => void;
    onDelete: (row: FoldedRow) => void;
    onStep: (by: 1 | -1) => void;
    row: FoldedRow | null;
}

/** One entry or transfer. On a phone it takes the whole screen, and an entry reads first with Edit below. */
export function EntrySheet({ onClose, onDelete, onStep, row }: EntrySheetProps) {
    const wide = useWide();
    // The sheet slides out after row clears, and it should carry the entry with it.
    const [shown, setShown] = useState(row);
    if (row && row !== shown) {
        setShown(row);
    }
    return (
        <Sheet
            onOpenChange={(open) => (open ? undefined : onClose())}
            open={row !== null}
            side={wide ? "right" : "bottom"}
        >
            <Sheet.Content className="app-shell ph-no-capture" showGrabber={false} size={wide ? "auto" : "full"}>
                {shown ? (
                    <EntryBody key={shown.id} onClose={onClose} onDelete={onDelete} onStep={onStep} row={shown} />
                ) : null}
            </Sheet.Content>
        </Sheet>
    );
}

// Fees follow their purchase, and installment rows follow their plan's rules, which this form does not know yet.
function editableDoc(ledger: Ledger, row: Exclude<FoldedRow, { fromId: string }>) {
    const doc = ledger.books.transactions.find((each) => each.localId === row.id);
    const financed =
        doc?.installmentId != null ||
        ledger.books.installmentPlans.some((plan) => plan.deletedAt === null && plan.transactionId === row.id);
    return row.feeFor !== null || financed ? undefined : doc;
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
                    <span className="block truncate text-[15px] font-semibold">{merchant}</span>
                    <span className="text-muted-foreground block truncate text-[13px]">{when}</span>
                </span>
            </div>
            <div className={`dash-figure mt-4 text-3xl font-semibold ${row.income ? "text-app-income" : ""}`}>
                {total}
            </div>
            {feeTotal > 0 ? (
                <div className="dash-figure text-muted-foreground mt-1 text-xs">
                    {detail.feeOf({
                        amount: money(figureOf(ledger, row).amount - feeTotal, ledger.currency),
                        fee: money(feeTotal, ledger.currency),
                    })}
                </div>
            ) : null}
        </>
    );
}

function InstallmentLine({ installmentId, rowId }: { installmentId: string | null | undefined; rowId: string }) {
    const { ledger } = useDashboard();
    const { detail, installmentOf } = useIntlayer("dashboard-transactions");
    const tag = installmentId ? installmentTags(ledger.books).get(installmentId) : undefined;
    const planned = ledger.books.installmentPlans.some(
        (plan) => plan.deletedAt === null && plan.transactionId === rowId
    );
    return (
        <Line label={detail.installments}>
            <span className="text-muted-foreground">
                {tag ? installmentOf({ at: String(tag.at), of: String(tag.of) }) : null}
                {!tag && !planned ? detail.off : null}
            </span>
        </Line>
    );
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
    const { ledger, photos } = useDashboard();
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
                    {account ? <AccountTile account={accountLook(account)} photos={photos} size="sm" /> : null}
                    <span className="truncate font-medium">{account?.name ?? copy.noAccount}</span>
                </Line>
                <Line label={form.currency} onPress={onEdit}>
                    <span className="font-medium">{raw?.currency ?? ledger.currency}</span>
                </Line>
                {foreign && raw ? (
                    <Line label={detail.charged}>
                        <span className="dash-figure">{money(raw.amount, foreign)}</span>
                    </Line>
                ) : null}
                <Line label={form.repeat} onPress={onEdit}>
                    <span className="text-muted-foreground">
                        {Object.entries(repeatNames).find(([type]) => Number(type) === repeat)?.[1] ?? repeatNames[0]}
                    </span>
                </Line>
                <InstallmentLine installmentId={raw?.installmentId} rowId={row.id} />
                {raw?.details?.trim() ? (
                    <Line label={detail.note}>
                        <span className="text-muted-foreground">{raw.details}</span>
                    </Line>
                ) : null}
            </div>
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
                    <p className="text-muted-foreground text-[13px]">{detail.editOnPhone}</p>
                )}
            </div>
        </>
    );
}

function useSheetKeys(onDelete: () => void, categoryTrigger: RefObject<HTMLButtonElement | null>) {
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
        }
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- the keyboard is an external system.
    useEffect(() => {
        document.addEventListener("keydown", onKeyEvent);
        return () => document.removeEventListener("keydown", onKeyEvent);
    }, []);
}

function EntryBody({ onClose, onDelete, onStep, row }: Omit<EntrySheetProps, "row"> & { row: FoldedRow }) {
    const { ledger } = useDashboard();
    const { open } = useAccountFlows();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const { detail, form } = useIntlayer("dashboard-transactions");
    const wide = useWide();
    const weekday = useWeekday();
    const { clockTime, money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const raw = "fromId" in row ? undefined : catalog.transaction(row.id);
    const photos = useImageUrls(raw?.imageKey ? [raw.imageKey] : []);
    const figure = figureOf(ledger, row);
    const categoryTrigger = useRef<HTMLButtonElement>(null);
    const [editing, setEditing] = useState(false);
    const remove = () => onDelete(row);
    useSheetKeys(remove, categoryTrigger);
    const time = clockTime(timeOfDay(row.at, ledger.offsetAt(row.at)));
    const when = `${weekday(row.day)}, ${time}`;
    if ("fromId" in row) {
        return (
            <Chrome
                body={<TransferBody onDelete={remove} row={row} when={when} />}
                categoryHint={false}
                more={<MoreMenu onDelete={remove} />}
                onStep={onStep}
                title={copy.transfer}
            />
        );
    }
    const doc = editableDoc(ledger, row);
    const imageUrl = raw?.imageKey ? photos?.get(raw.imageKey) : undefined;
    const total = money(row.income ? figure.amount : -figure.amount, ledger.currency, "always");
    const logAgain = doc
        ? () => {
              onClose();
              open({ from: row.id, kind: "entry" });
          }
        : undefined;
    const more = <MoreMenu onDelete={remove} onLogAgain={logAgain} />;
    if (doc && (wide || editing)) {
        return (
            <Chrome
                body={
                    <EntryEditor
                        categoryTrigger={categoryTrigger}
                        doc={doc}
                        imageUrl={imageUrl}
                        key={doc.localId}
                        onDelete={remove}
                        onLogAgain={() => logAgain?.()}
                        total={total}
                    />
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

function TransferBody({
    onDelete,
    row,
    when,
}: {
    onDelete: () => void;
    row: Extract<FoldedRow, { fromId: string }>;
    when: string;
}) {
    const { ledger, photos } = useDashboard();
    const { bulk, detail, form } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const name = (id: string | null) => (id === null ? "" : (ledger.accounts.get(id)?.name ?? ""));
    const move = ledger.books.transfers.find((each) => each.localId === row.id);
    const crossed = row.sentCurrency !== row.arrivedCurrency && row.sent > 0;
    const moves = transferMoves(row, ledger.currency);
    const rateNames = { custom: form.rateCustom, eur_reference: "EUR (BCV)", official: form.rateOfficial };
    const tile = (id: string | null) => {
        const look = id === null ? null : catalog.account(id);
        return look ? <AccountTile account={look} photos={photos} size="md" /> : null;
    };
    const side = (label: ReactNode, id: string | null) => (
        <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="border-border flex h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 text-sm font-medium">
                {tile(id)}
                <span className="truncate">{name(id)}</span>
            </span>
        </div>
    );
    return (
        <>
            <div className="grid grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] items-end gap-2">
                {side(detail.from, row.fromId)}
                <HugeiconsIcon icon={ArrowRight02Icon} className="text-muted-foreground mb-3" size={16} />
                {side(detail.to, row.toId)}
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] gap-2">
                <div className="min-w-0">
                    <div className="dash-figure truncate text-xl font-semibold">
                        {money(row.sent, row.sentCurrency)}
                    </div>
                    <div className="dash-figure text-muted-foreground mt-1 text-xs">{row.sentCurrency}</div>
                </div>
                <span className="w-4" />
                <div className="min-w-0">
                    <div className="dash-figure truncate text-xl font-semibold">
                        {money(row.arrived, row.arrivedCurrency)}
                    </div>
                    <div className="dash-figure text-muted-foreground mt-1 truncate text-xs">
                        {row.arrivedCurrency}
                        {crossed
                            ? ` · ${
                                  detail.perUnit({
                                      currency: row.sentCurrency,
                                      rate: (row.arrived / row.sent).toFixed(RATE_DIGITS),
                                  }).value
                              }`
                            : ""}
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <Line label={detail.date}>
                    <span className="dash-figure">{when}</span>
                </Line>
                {move?.exchangeRateType ? (
                    <Line label={detail.rate}>
                        <span className="font-medium">
                            {Object.entries(rateNames).find(([type]) => type === move.exchangeRateType)?.[1] ??
                                move.exchangeRateType}
                        </span>
                    </Line>
                ) : null}
                {row.fees.map((fee) => (
                    <Line key={fee.id} label={detail.fee}>
                        <span className="dash-figure font-medium">{money(fee.amount, ledger.currency)}</span>
                        <span className="text-muted-foreground truncate">
                            {detail.fromAccount({ account: name(fee.accountId) })}
                        </span>
                    </Line>
                ))}
                {move?.note.trim() ? <Line label={detail.note}>{move.note}</Line> : null}
            </div>
            <div className="text-muted-foreground mt-6 mb-1 text-xs font-medium">{detail.moves}</div>
            <div className="border-border border-t">
                <Line
                    label={
                        <span className="text-foreground flex items-center gap-2 font-medium whitespace-nowrap">
                            {tile(row.fromId)}
                            {name(row.fromId)}
                        </span>
                    }
                >
                    <span className="dash-figure">{money(-moves.sent, row.sentCurrency, "always")}</span>
                </Line>
                <Line
                    label={
                        <span className="text-foreground flex items-center gap-2 font-medium whitespace-nowrap">
                            {tile(row.toId)}
                            {name(row.toId)}
                        </span>
                    }
                >
                    <span className="dash-figure">{money(row.arrived, row.arrivedCurrency, "always")}</span>
                </Line>
                {moves.apart.map((fee) => (
                    <Line key={fee.id} label={detail.fee}>
                        <span className="dash-figure">{money(-fee.amount, ledger.currency, "always")}</span>
                    </Line>
                ))}
            </div>
            <div className="flex items-center gap-2 py-4">
                <Button onClick={onDelete} size="sm" variant="outline">
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                    {bulk.delete}
                </Button>
                <p className="text-muted-foreground ml-auto text-[13px]">{detail.editOnPhone}</p>
            </div>
        </>
    );
}
