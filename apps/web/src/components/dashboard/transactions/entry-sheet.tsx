import { RiArrowDownSLine, RiArrowUpSLine, RiRepeatLine } from "@remixicon/react";
import { Sheet } from "panelui-web/sheet";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { FeeTile, MerchantTile, TransferTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "../home/catalog";
import { timeOfDay, useCategoryName, useDateFormat } from "../home/format";
import { figureOf } from "../home/rows";
import type { FoldedRow } from "../home/rows";
import { useWide } from "../insights/use-wide";

const ISO_CURRENCY = /^[A-Z]{3}$/u;
const RATE_DIGITS = 4;

function Field({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="border-border flex min-h-11 items-center gap-3 border-b py-2 text-sm last:border-0">
            <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">{children}</dd>
        </div>
    );
}

interface EntrySheetProps {
    onClose: () => void;
    onStep: (by: 1 | -1) => void;
    row: FoldedRow | null;
}

/** One entry or transfer, read-only: the web cannot write to the ledger yet. */
export function EntrySheet({ onClose, onStep, row }: EntrySheetProps) {
    const wide = useWide();
    return (
        <Sheet
            onOpenChange={(open) => (open ? undefined : onClose())}
            open={row !== null}
            side={wide ? "right" : "bottom"}
        >
            <Sheet.Content className="app-shell dash-sheet ph-no-capture" detached={wide}>
                {row ? <EntryBody onStep={onStep} row={row} /> : null}
            </Sheet.Content>
        </Sheet>
    );
}

function EntryBody({ onStep, row }: { onStep: (by: 1 | -1) => void; row: FoldedRow }) {
    const { ledger } = useDashboard();
    const { transactions: copy } = useIntlayer("dashboard-home");
    const { detail } = useIntlayer("dashboard-transactions");
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { clockTime, money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const raw = "fromId" in row ? undefined : catalog.transaction(row.id);
    const photos = useImageUrls(raw?.imageKey ? [raw.imageKey] : []);
    const figure = figureOf(ledger, row);
    const accountName = (id: string | null) =>
        id === null ? copy.noAccount.value : (ledger.accounts.get(id)?.name ?? "");
    const when = `${date.weekday(row.day)} · ${clockTime(timeOfDay(row.at, ledger.offsetAt(row.at)))}`;
    const fees = row.fees.map((fee) => (
        <Field key={fee.id} label={detail.fee}>
            <span className="text-muted-foreground truncate">{accountName(fee.accountId)}</span>
            <span className="dash-figure">{money(-fee.amount, ledger.currency, "always")}</span>
        </Field>
    ));
    const stepper = (
        <div className="flex gap-1">
            <button
                aria-label={detail.previous.value}
                className="dash-icon-btn"
                onClick={() => onStep(-1)}
                type="button"
            >
                <RiArrowUpSLine size={18} />
            </button>
            <button aria-label={detail.next.value} className="dash-icon-btn" onClick={() => onStep(1)} type="button">
                <RiArrowDownSLine size={18} />
            </button>
        </div>
    );
    if ("fromId" in row) {
        return <TransferBody accountName={accountName} fees={fees} row={row} stepper={stepper} when={when} />;
    }
    const top = ledger.categories.get(row.topId);
    const category = row.categoryId ? ledger.categories.get(row.categoryId) : undefined;
    const name = top ? categoryName(top) : "";
    const merchant = row.note.trim() || name;
    const standsAlone = row.feeFor !== null;
    const foreign =
        raw?.currency && raw.currency !== ledger.currency && ISO_CURRENCY.test(raw.currency) ? raw.currency : null;
    return (
        <>
            <Sheet.Header title={merchant} />
            <Sheet.Body className="min-w-0! px-4">
                <div className="flex items-center gap-3 pb-4">
                    {standsAlone ? (
                        <FeeTile />
                    ) : (
                        <MerchantTile
                            imageUrl={raw?.imageKey ? photos?.get(raw.imageKey) : undefined}
                            name={merchant}
                            size="lg"
                        />
                    )}
                    <span className={`dash-figure text-2xl font-semibold ${row.income ? "text-app-income" : ""}`}>
                        {money(row.income ? figure.amount : -figure.amount, ledger.currency, "always")}
                    </span>
                    <span className="ml-auto">{stepper}</span>
                </div>
                <dl>
                    <Field label={copy.columns.category}>
                        {standsAlone ? (
                            <span className="text-muted-foreground">
                                {raw?.feeForId ? copy.cardFee : copy.transferFee}
                            </span>
                        ) : (
                            <>
                                <span
                                    aria-hidden
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: top?.color }}
                                />
                                <span className="truncate">
                                    {name}
                                    {category && category.id !== top?.id ? ` · ${categoryName(category)}` : ""}
                                </span>
                            </>
                        )}
                    </Field>
                    <Field label={copy.columns.account}>
                        <span className="truncate">{accountName(row.accountId)}</span>
                    </Field>
                    <Field label={detail.date}>{when}</Field>
                    {foreign && raw ? (
                        <Field label={detail.charged}>
                            <span className="dash-figure">{money(raw.amount, foreign)}</span>
                        </Field>
                    ) : null}
                    {fees}
                    {(raw?.recurringType ?? 0) > 0 ? (
                        <Field label={detail.repeats}>
                            <RiRepeatLine aria-hidden size={16} />
                        </Field>
                    ) : null}
                    {raw?.details?.trim() ? (
                        <Field label={detail.note}>
                            <span className="text-left whitespace-pre-wrap">{raw.details}</span>
                        </Field>
                    ) : null}
                </dl>
                <p className="text-muted-foreground py-4 text-[13px]">{detail.editOnPhone}</p>
            </Sheet.Body>
        </>
    );
}

interface TransferBodyProps {
    accountName: (id: string | null) => string;
    fees: ReactNode;
    row: Extract<FoldedRow, { fromId: string }>;
    stepper: ReactNode;
    when: string;
}

function TransferBody({ accountName, fees, row, stepper, when }: TransferBodyProps) {
    const { ledger, photos: accountPhotos } = useDashboard();
    const { detail } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const figure = figureOf(ledger, row);
    const move = ledger.books.transfers.find((each) => each.localId === row.id);
    const crossed = row.sentCurrency !== row.arrivedCurrency && row.sent > 0;
    return (
        <>
            <Sheet.Header title={`${accountName(row.fromId)} → ${accountName(row.toId)}`} />
            <Sheet.Body className="min-w-0! px-4">
                <div className="flex items-center gap-3 pb-4">
                    <TransferTile
                        from={catalog.account(row.fromId)}
                        photos={accountPhotos}
                        to={catalog.account(row.toId)}
                    />
                    <span className="dash-figure text-2xl font-semibold">{money(figure.amount, ledger.currency)}</span>
                    <span className="ml-auto">{stepper}</span>
                </div>
                <dl>
                    <Field label={detail.from}>
                        <span className="truncate">{accountName(row.fromId)}</span>
                        <span className="dash-figure">{money(-row.sent, row.sentCurrency, "always")}</span>
                    </Field>
                    <Field label={detail.to}>
                        <span className="truncate">{accountName(row.toId)}</span>
                        <span className="dash-figure text-app-income">
                            {money(row.arrived, row.arrivedCurrency, "always")}
                        </span>
                    </Field>
                    {crossed ? (
                        <Field label={detail.rate}>
                            <span className="dash-figure">
                                1 {row.sentCurrency} = {(row.arrived / row.sent).toFixed(RATE_DIGITS)}{" "}
                                {row.arrivedCurrency}
                            </span>
                        </Field>
                    ) : null}
                    <Field label={detail.date}>{when}</Field>
                    {fees}
                    {move?.note.trim() ? <Field label={detail.note}>{move.note}</Field> : null}
                </dl>
                <p className="text-muted-foreground py-4 text-[13px]">{detail.editOnPhone}</p>
            </Sheet.Body>
        </>
    );
}
