import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";
import type { Ref } from "react";

import type { Account } from "@/data/accounts-core";
import { useNow } from "@/data/use-now";
import { formatSentenceDate } from "@/domain/dates";
import {
    EVERY_OPTIONS,
    MAX_INSTALLMENT_COUNT,
    overPrice,
    paidBeforeCount,
    rescheduled,
    UPFRONT_SHARES,
    upfrontOf,
} from "@/domain/installment-draft";
import type { InstallmentDraft } from "@/domain/installment-draft";
import { planPhrase } from "@/domain/installment-plan-phrase";
import type { InstallmentSeed } from "@/domain/installment-scan";
import type { ScheduledInstallment } from "@/domain/installments";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { dueIn } from "@/screens/installments/labels";

import { AmountEntrySheet } from "../amount-entry-sheet";

const PERCENT = 100;
// No account id can collide: they are uuids.
export const NONE = "__none__";

type PadTarget = "each" | "upfront" | { sequence: number };

export interface InstallmentsSheetProps {
    accounts: readonly Account[];
    currency: string;
    draft: InstallmentDraft;
    /** The form already says the entry's own rate is missing, so the sheet does not. */
    entryRateMissing: boolean;
    fees: InstallmentSeed["fees"];
    onChange: (next: InstallmentDraft) => void;
    /** In the plan's currency; null while there is no rate to convert it with. */
    price: number | null;
    purchaseDay: Date;
    ref?: Ref<BottomSheetModal>;
    schedule: readonly ScheduledInstallment[] | null;
}

export function useInstallmentsSheetForm({
    accounts,
    currency,
    draft,
    entryRateMissing,
    fees,
    onChange,
    price,
    schedule,
}: InstallmentsSheetProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const nowMs = useNow();
    const minorUnits = minorUnitsFor(currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [pad, setPad] = useState<{ target: PadTarget; text: string } | null>(null);
    const [open, setOpen] = useState<"every" | "firstDue" | number | null>(null);
    const money = (value: number) => formatAmount(value, currency, true, language);

    const upfront = price === null ? 0 : upfrontOf(draft, price, currency);
    const installments = schedule?.filter((row) => row.sequence > 0) ?? [];
    const firstDue = installments[0]?.dueDate ?? draft.firstDue;
    const each = draft.each ?? installments[0]?.amount ?? 0;
    const from = accounts.find((account) => account.id === draft.upfrontAccountId) ?? null;
    const paidBefore = schedule ? paidBeforeCount(draft, schedule, new Date(nowMs)) : 0;
    const total = schedule?.reduce((sum, row) => sum + row.amount, 0) ?? 0;
    const over = schedule && price !== null ? overPrice(schedule, price, currency) : 0;
    const summary = planPhrase(t, { count: draft.count, interval: EVERY_OPTIONS[draft.every], upfront: upfront > 0 });
    const shares = [
        ...UPFRONT_SHARES.map((share) => ({
            label: `${Math.round(share * PERCENT)}%`,
            onPress: () => onChange({ ...draft, upfront: { share } }),
            selected: "share" in draft.upfront && draft.upfront.share === share,
        })),
        {
            label: t("installments.none"),
            onPress: () => onChange({ ...draft, upfront: { amount: 0 } }),
            selected: "amount" in draft.upfront && draft.upfront.amount === 0,
        },
    ];

    const openPad = (target: PadTarget, value: number) => {
        setPad({ target, text: numberToNumpad(value, minorUnits) });
        padRef.current?.present();
    };

    const closePad = () => {
        padRef.current?.dismiss();
        if (pad === null) {
            return;
        }
        const value = numpadToNumber(pad.text);
        const { target } = pad;
        if (target === "each") {
            onChange(rescheduled(draft, { each: value > 0 ? value : null }));
        } else if (target === "upfront") {
            onChange({ ...draft, upfront: { amount: value } });
        } else if (value > 0) {
            const edit = { ...draft.edits[target.sequence], amount: value };
            onChange({ ...draft, edits: { ...draft.edits, [target.sequence]: edit } });
        }
        setPad(null);
    };

    const editDate = (sequence: number, dueDate: Date) => {
        setOpen(null);
        onChange({ ...draft, edits: { ...draft.edits, [sequence]: { ...draft.edits[sequence], dueDate } } });
    };

    // Payments apply oldest first, so checking a cuota checks every one before it.
    const toggle = (sequence: number) =>
        onChange({ ...draft, paidBefore: sequence <= paidBefore ? sequence - 1 : sequence });

    const rowDetail = (row: ScheduledInstallment): string | null => {
        if (row.sequence === 0) {
            return `${formatSentenceDate(row.dueDate, language)} · ${from ? from.name : t("installments.notFromAccount")}`;
        }
        if (row.sequence <= paidBefore) {
            return t("installments.paidBefore");
        }
        return row.sequence === paidBefore + 1 ? dueIn(t, row.dueDate, nowMs) : null;
    };

    const feeLine = (row: ScheduledInstallment): string | null => {
        const fee = fees.find((candidate) => candidate.sequence === row.sequence);
        return fee ? t("installments.fee.extra", { fee: money(fee.amount) }) : null;
    };

    let emptyNote: string | null = null;
    if (!entryRateMissing) {
        emptyNote = t(price === null ? "installments.noRate" : "installments.nothingLeft");
    }

    const step = (by: number) =>
        onChange(rescheduled(draft, { count: Math.min(MAX_INSTALLMENT_COUNT, Math.max(1, draft.count + by)) }));

    return {
        closePad,
        each,
        editDate,
        emptyNote,
        feeLine,
        firstDue,
        from,
        minorUnits,
        money,
        open,
        openPad,
        over,
        pad,
        padRef,
        paidBefore,
        rowDetail,
        setOpen,
        setPadText: (text: string) => setPad((current) => (current ? { ...current, text } : current)),
        shares,
        step,
        summary,
        toggle,
        total,
        upfront,
    };
}

export function InstallmentsPad({
    currency,
    form,
}: {
    currency: string;
    form: ReturnType<typeof useInstallmentsSheetForm>;
}) {
    const { closePad, minorUnits, pad, padRef, setPadText } = form;
    return (
        <AmountEntrySheet
            code={currency}
            minorUnits={minorUnits}
            onChange={setPadText}
            onDone={closePad}
            ref={padRef}
            value={pad?.text ?? ""}
        />
    );
}
