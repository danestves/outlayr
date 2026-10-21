import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { toAccountKind } from "@outlayr/money/account-kind";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import { AccountTile } from "@/components/account-tile";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { ChoiceRow } from "@/components/list/list-row";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountBalance, useAccounts, useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { getLastUsedAccount } from "@/data/accounts-core";
import { usePaymentRate } from "@/data/installment-reads";
import { installmentsRepo } from "@/data/installments-core";
import type { PlanWithStanding } from "@/data/installments-core";
import { useNow } from "@/data/use-now";
import { paymentSource, paymentSources } from "@/domain/installment-payment";
import { orderName } from "@/domain/installments";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { formatRateFigure, pairQuotedInverse, quotePairRate } from "@/domain/transaction-entry-rate";
import { quotedByBcv } from "@/domain/transaction-form-labels";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

import { useInstallmentEntry } from "./use-order";

export interface PayFormProps {
    account: Account | null;
    amount: number;
    entry: PlanWithStanding;
    forNext: boolean;
    sources: readonly Account[];
}

export function usePayEntry(planId: string, all: boolean): PayFormProps | null {
    const db = useDatabase();
    const { entry } = useInstallmentEntry(planId);
    const accounts = useAccounts(db);
    const sources = paymentSources(useBankAccounts(db), entry?.plan.accountId);

    const owed = entry?.standing.next;
    if (entry == null || owed == null) {
        return null;
    }
    return {
        account: accounts.find((account) => account.id === entry.plan.accountId) ?? null,
        amount: all ? entry.standing.remaining : owed.remaining,
        entry,
        forNext: !all,
        sources,
    };
}

export function usePayForm({ account, amount: owed, entry, forNext, sources }: PayFormProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { plan, purchase, standing } = entry;
    const minorUnits = minorUnitsFor(plan.currency);
    const padRef = useRef<BottomSheetModal>(null);
    const [padText, setPadText] = useState(() => numberToNumpad(owed, minorUnits));
    const [date, setDate] = useState(() => new Date());
    const [pickingDate, setPickingDate] = useState(false);
    const [pickingFrom, setPickingFrom] = useState(false);
    // Null is None: paid outside Outlayr.
    const [fromId, setFromId] = useState<string | null>(() => {
        // A card pays only when picked: the default stays a bank.
        const banks = sources.filter((source) => toAccountKind(source.kind) !== "liability");
        const last = getLastUsedAccount(db);
        return banks.find((source) => source.id === last?.id)?.id ?? banks[0]?.id ?? null;
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const from = sources.find((source) => source.id === fromId) ?? null;
    const amount = numpadToNumber(padText);
    const rate = usePaymentRate(db, from?.currency ?? plan.currency, plan.currency, date);
    const source = from === null ? null : paymentSource(amount, from, plan.currency, rate);
    const canPay = amount > 0 && (from === null || source !== null);
    const money = (value: number, code = plan.currency) => formatAmount(value, code, showCents, language);
    const converted = from ? convertedLine(t, language, amount, from.currency, plan.currency, rate) : null;

    const name = orderName(t, purchase);
    const { next } = standing;
    const forLabel =
        forNext && next
            ? t("installments.forOrder", {
                  count: standing.installmentsTotal,
                  index: next.row.sequence,
                  order: name,
              })
            : name;

    const pickFrom = (id: string | null) => {
        setFromId(id);
        setPickingFrom(false);
    };

    const confirm = async () => {
        if (busy || !canPay) {
            return;
        }
        setBusy(true);
        setFailure(null);
        try {
            await installmentsRepo.recordPayment(db, { amount, date, planId: plan.id, source });
            rearmInstallmentReminders(db);
            haptics("success");
            router.back();
        } catch (error) {
            console.error("Failed to record the installment payment", error);
            haptics("error");
            setFailure(t("installments.failedBody"));
            setBusy(false);
        }
    };

    return {
        accountName: account?.name ?? "",
        amount,
        busy,
        canPay,
        confirm,
        converted,
        date,
        failure,
        forLabel,
        from,
        minorUnits,
        money,
        padRef,
        padText,
        pickFrom,
        pickingDate,
        pickingFrom,
        plan,
        setDate,
        setPadText,
        setPickingDate,
        setPickingFrom,
    };
}

/** "Bs 4,370.60 at BCV 218.53" for a payment from another currency, null in the same one. */
function convertedLine(
    t: TranslateFn,
    language: Language,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rate: number | null
): string | null {
    if (fromCurrency === toCurrency) {
        return null;
    }
    const source = paymentSource(amount, { currency: fromCurrency, id: "" }, toCurrency, rate);
    if (source === null || rate === null) {
        return t("installments.noRate");
    }
    return t("installments.pay.converted", {
        amount: formatAmount(source.fromAmount, fromCurrency, true, language),
        rate: `${quotedByBcv(fromCurrency, toCurrency) ? "BCV " : ""}${formatRateFigure(
            quotePairRate(pairQuotedInverse(fromCurrency, toCurrency), rate),
            language
        )}`,
    });
}

const TILE = 28;

export function SourceTile({ account }: { account: Account | null }) {
    const colors = useColors();
    return account ? (
        <AccountTile account={account} size={TILE} />
    ) : (
        <CategoryIconTile color={colors.muted} icon={null} size={TILE} type="solid" />
    );
}

interface SourceChoiceProps {
    account: Account;
    amount: number;
    date: Date;
    onPress: () => void;
    selected: boolean;
    toCurrency: string;
}

export function SourceChoice({ account, amount, date, onPress, selected, toCurrency }: SourceChoiceProps) {
    const db = useDatabase();
    const t = useTranslation();
    const nowMs = useNow();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const balance = useAccountBalance(db, account, nowMs);
    const rate = usePaymentRate(db, account.currency, toCurrency, date);
    return (
        <ChoiceRow
            detail={convertedLine(t, language, amount, account.currency, toCurrency, rate) ?? undefined}
            label={account.name}
            leading={<SourceTile account={account} />}
            onPress={onPress}
            selected={selected}
            value={formatAmount(balance.total, account.currency, showCents, language)}
        />
    );
}
