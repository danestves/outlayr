import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { decimalsFor } from "@outlayr/money/currency";
import { MARKET_RATE_TYPES } from "@outlayr/money/rates";
import type { FeeSide } from "@outlayr/money/transfer-reconcile";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AmountInput } from "@/components/dashboard/accounts/fields";
import { useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { money } from "@/lib/ledger";
import { commitRows } from "@/lib/ledger-commit";
import { ledgerBooks } from "@/lib/ledger-db";

import { DateRow, NoteSlot, Pick, QUIET_INPUT, Slot } from "./entry-form";
import {
    currencyOf,
    editedTransfer,
    repriced,
    swappedTransfer,
    transferBaseOf,
    transferInputOf,
    transferProblem,
    withAccounts,
} from "./transfer-writes";
import type { TransferDoc, TransferProblem, TransferValues } from "./transfer-writes";

const RATE_DIGITS = 2;
const PICK_CHROME_CHARS = 8;
const FEE_SIDES = ["source", "destination"] as const satisfies readonly FeeSide[];
// Native offers EUR (BCV) only for money arriving in bolivars.
const EUR_REFERENCE_CURRENCY = "VES";

function AmountColumn({
    currency,
    onText,
    rate,
    text,
}: {
    currency: string;
    onText: (text: string) => void;
    rate?: string;
    text: string;
}) {
    return (
        <div className="min-w-0">
            <div className="[&_[data-slot=input-group]]:border-transparent! [&_[data-slot=input-group]]:bg-transparent! [&_[data-slot=input-group]]:shadow-none! [&_input]:px-0! [&_input]:text-xl! [&_input]:font-semibold!">
                <AmountInput currency={currency} onText={onText} text={text} />
            </div>
            <div className="dash-figure text-muted-foreground text-xs">
                {currency}
                {rate ? ` · ${rate}` : ""}
            </div>
        </div>
    );
}

/** The drawer's transfer editor. No Save: a choice saves at once, typing on blur, whatever is left on close. */
export function TransferEditor({
    children,
    doc,
    onDelete,
}: {
    children: ReactNode;
    doc: TransferDoc;
    onDelete: () => void;
}) {
    const { ledger, photos } = useDashboard();
    const db = useLedgerDb();
    const { bulk, detail, form } = useIntlayer("dashboard-transactions");
    const { toast } = useAccountFlows();
    const [base] = useState(() => transferBaseOf(ledger, doc));
    const [values, setValues] = useState(base.start);
    const [problem, setProblem] = useState<TransferProblem | null>(null);
    const saved = useRef(JSON.stringify(transferInputOf(ledger, base, base.start)));
    const save = (next: TransferValues) => {
        const books = ledgerBooks(db);
        const live = books.transfers.find((row) => row.localId === doc.localId);
        if (!live || live.deletedAt !== null) {
            return;
        }
        const current = { ...ledger, books };
        const input = transferInputOf(current, base, next);
        const key = JSON.stringify(input);
        const found = transferProblem(current, live, input);
        setProblem(found);
        if (found !== null || key === saved.current) {
            return;
        }
        saved.current = key;
        commitRows(db, editedTransfer(current, live, input, Date.now())).catch(() => {
            toast({ failed: true, text: form.saveFailed.value });
        });
    };
    const flush = useEffectEvent(() => save(values));
    // oxlint-disable-next-line outlayr/react-effect-budget -- Esc and J K unmount this with no blur to save on.
    useEffect(() => () => flush(), []);

    const pick = (next: TransferValues) => {
        setValues(next);
        save(next);
    };
    const change = (patch: Partial<TransferValues>) => {
        setValues((current) => ({ ...current, ...patch }));
        setProblem(null);
    };
    const sentCurrency = currencyOf(ledger.books, base, values.fromId);
    const arrivedCurrency = currencyOf(ledger.books, base, values.toId);
    const crossed = sentCurrency !== arrivedCurrency;
    const sent = parseAmount(values.sentText, decimalsFor(sentCurrency));
    const arrived = parseAmount(values.arrivedText, decimalsFor(arrivedCurrency));
    // The smaller side is the unit, so a bolivar to dollar transfer doesn't read as 0.00 per VES.
    const perUnit =
        arrived >= sent
            ? detail.perUnit({ currency: sentCurrency, rate: (arrived / sent).toFixed(RATE_DIGITS) }).value
            : detail.perUnit({ currency: arrivedCurrency, rate: (sent / arrived).toFixed(RATE_DIGITS) }).value;
    const typeSent = (sentText: string) => {
        const moved = parseAmount(sentText, decimalsFor(sentCurrency)) !== sent;
        // One currency moves one amount until someone says it arrived short.
        const mirrored = !crossed && values.sentText === values.arrivedText;
        change({
            arrivedText: mirrored ? sentText : values.arrivedText,
            rateType: crossed && moved ? "custom" : values.rateType,
            sentText,
        });
    };
    const typeArrived = (arrivedText: string) => {
        const moved = parseAmount(arrivedText, decimalsFor(arrivedCurrency)) !== arrived;
        change({ arrivedText, rateType: crossed && moved ? "custom" : values.rateType });
    };
    const pickFrom = (fromId: string) =>
        pick(
            fromId === values.toId ? swappedTransfer(values) : withAccounts(ledger, base, values, fromId, values.toId)
        );
    const pickTo = (toId: string) =>
        pick(
            toId === values.fromId ? swappedTransfer(values) : withAccounts(ledger, base, values, values.fromId, toId)
        );
    const pickRate = (next: string) => {
        const market = MARKET_RATE_TYPES.find((type) => type === next);
        const priced = market ? repriced(ledger, base, values, market) : { ...values, rateType: next };
        if (priced === null) {
            setProblem("rateMissing");
            return;
        }
        pick(priced);
    };

    const accountOptions = [
        ...openAccounts(ledger.books),
        ...ledger.books.accounts.filter(
            (row) => (row.localId === values.fromId || row.localId === values.toId) && row.archivedAt != null
        ),
    ].map((row) => ({
        icon: <AccountTile account={accountLook(row)} photos={photos} size="sm" />,
        label: row.name,
        value: row.localId,
    }));
    const nameOf = (id: string) => ledger.books.accounts.find((row) => row.localId === id)?.name ?? "";
    const rateNames = new Map([
        ["binance", "Binance"],
        ["custom", form.rateCustom.value],
        ["eur_reference", "EUR (BCV)"],
        [
            "official",
            [sentCurrency, arrivedCurrency].includes(EUR_REFERENCE_CURRENCY) ? "USD (BCV)" : form.rateOfficial.value,
        ],
    ]);
    const rateTypes = ["official", ...(arrivedCurrency === EUR_REFERENCE_CURRENCY ? ["eur_reference"] : []), "custom"];
    const rateOptions = [
        ...rateTypes,
        ...(values.rateType !== null && !rateTypes.includes(values.rateType) ? [values.rateType] : []),
    ].map((type) => ({ label: rateNames.get(type) ?? type, value: type }));
    const hasFee = FEE_SIDES.some((side) => values.feeTexts[side] !== null);
    // Each side gets room for what it holds, so a swap doesn't clip the longer name or amount.
    const widthOf = (id: string, text: string) => Math.max(nameOf(id).length + PICK_CHROME_CHARS, text.length);
    const columns = `minmax(0, ${widthOf(values.fromId, values.sentText)}fr) auto minmax(0, ${widthOf(values.toId, values.arrivedText)}fr)`;
    return (
        <div onBlur={() => save(values)}>
            <div className="grid items-end gap-2" style={{ gridTemplateColumns: columns }}>
                <div className="flex min-w-0 flex-col gap-1.5 [&_[data-slot=select-value]]:block! [&_[data-slot=select-value]]:truncate">
                    <span className="text-muted-foreground text-xs">{detail.from}</span>
                    <Pick bare onPick={pickFrom} options={accountOptions} quiet={false} value={values.fromId} />
                </div>
                <HugeiconsIcon icon={ArrowRight02Icon} className="text-muted-foreground mb-3" size={16} />
                <div className="flex min-w-0 flex-col gap-1.5 [&_[data-slot=select-value]]:block! [&_[data-slot=select-value]]:truncate">
                    <span className="text-muted-foreground text-xs">{detail.to}</span>
                    <Pick bare onPick={pickTo} options={accountOptions} quiet={false} value={values.toId} />
                </div>
            </div>
            <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: columns }}>
                <AmountColumn currency={sentCurrency} onText={typeSent} text={values.sentText} />
                <span className="w-4" />
                <AmountColumn
                    currency={arrivedCurrency}
                    onText={typeArrived}
                    rate={crossed && sent > 0 && arrived > 0 ? perUnit : undefined}
                    text={values.arrivedText}
                />
            </div>
            {problem === "empty-leg" || problem === "rateMissing" ? (
                <p className="text-destructive mt-2 text-[13px]" role="alert">
                    {problem === "empty-leg" ? form.amountRequired : form.rateMissing}
                </p>
            ) : null}
            <div className="mt-4">
                <Slot error={problem === "date" ? form.dateRequired : null} label={detail.date} quiet>
                    <DateRow onChange={(dateText) => pick({ ...values, dateText })} quiet text={values.dateText} />
                </Slot>
                {crossed ? (
                    <Slot label={detail.rate} quiet>
                        <Pick onPick={pickRate} options={rateOptions} quiet value={values.rateType ?? "custom"} />
                    </Slot>
                ) : null}
                {FEE_SIDES.map((side) => {
                    const text = values.feeTexts[side];
                    const feeIn = side === "source" ? sentCurrency : arrivedCurrency;
                    return text === null ? null : (
                        <Slot key={side} label={detail.fee} quiet>
                            <div className="flex min-w-0 items-center justify-end gap-1">
                                <Input
                                    aria-label={detail.fee.value}
                                    className={`dash-figure ${QUIET_INPUT} w-24 px-1.5!`}
                                    inputMode="decimal"
                                    onChange={(event) =>
                                        change({ feeTexts: { ...values.feeTexts, [side]: event.target.value } })
                                    }
                                    onBlur={() =>
                                        text.trim() === ""
                                            ? undefined
                                            : change({
                                                  feeTexts: {
                                                      ...values.feeTexts,
                                                      [side]: money(parseAmount(text, decimalsFor(feeIn)), feeIn),
                                                  },
                                              })
                                    }
                                    placeholder={money(0, feeIn)}
                                    value={text}
                                />
                                <span className="text-muted-foreground truncate text-sm">
                                    {detail.fromAccount({
                                        account: nameOf(side === "source" ? values.fromId : values.toId),
                                    })}
                                </span>
                                <Button
                                    aria-label={form.removeFee.value}
                                    className="text-muted-foreground -me-2"
                                    onClick={() => pick({ ...values, feeTexts: { ...values.feeTexts, [side]: null } })}
                                    size="icon-sm"
                                    type="button"
                                    variant="ghost"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={15} />
                                </Button>
                            </div>
                        </Slot>
                    );
                })}
                {hasFee ? null : (
                    <Slot label={detail.fee} quiet>
                        <Button
                            className="text-muted-foreground -me-2 ml-auto w-fit"
                            onClick={() => change({ feeTexts: { ...values.feeTexts, source: "" } })}
                            size="sm"
                            type="button"
                            variant="ghost"
                        >
                            {detail.addFee}
                        </Button>
                    </Slot>
                )}
                <NoteSlot onChange={(note) => change({ note })} quiet text={values.note} />
            </div>
            {children}
            <div className="flex items-center gap-2 py-4">
                <Button onClick={() => pick(swappedTransfer(values))} size="sm" variant="outline">
                    <HugeiconsIcon icon={ArrowDataTransferHorizontalIcon} size={14} />
                    {detail.swap}
                </Button>
                <Button onClick={onDelete} size="sm" variant="outline">
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                    {bulk.delete}
                </Button>
            </div>
        </div>
    );
}
