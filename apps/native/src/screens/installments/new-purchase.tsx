import { toAccountKind } from "@outlayr/money/account-kind";
import { draftSchedule, paidBeforeCount, upfrontOf } from "@outlayr/money/installment-draft";
import type { InstallmentDraft } from "@outlayr/money/installment-draft";
import { startingDraft } from "@outlayr/money/installment-terms";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRef, useState } from "react";
import { ScrollView } from "react-native";

import { TransactionFormAmountPad } from "@/components/transaction-form/amount-pad";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import type { Category } from "@/data/categories-core";
import { lastPlanRows, paymentRate } from "@/data/installment-reads";
import type { PaymentSource } from "@/data/installments-core";
import { paymentSource, paymentSources } from "@/domain/installment-payment";
import { DEFAULT_CURRENCY, minorUnitsFor } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { useTranslation } from "@/i18n/context";
import { useMirror } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { rememberSavedEntry } from "@/state/entry-commit";
import { placeOrder } from "@/state/installment-orders";
import { askForInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomCommand } from "@/state/use-atom-command";

import { NewPurchasePlan } from "./new-purchase-plan";
import { PurchaseToolbar } from "./new-purchase-toolbar";
import { NewPurchaseWhere } from "./new-purchase-where";

type Step = "plan" | "total" | "where";

interface NewInstallmentPurchaseProps {
    accountId?: string;
    amount?: number;
    currency?: string;
    onDirtyChange: (dirty: boolean) => void;
    onDone: () => void;
}

export function NewInstallmentPurchase({
    accountId,
    amount,
    currency,
    onDirtyChange,
    onDone,
}: NewInstallmentPurchaseProps) {
    const db = useDatabase();
    const t = useTranslation();
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const bankAccounts = useBankAccounts(db);
    const [account, setAccount] = useState<Account | null>(
        () => bankAccounts.find((row) => row.id === accountId && toAccountKind(row.kind) === "liability") ?? null
    );
    const prefill = amount !== undefined && Number.isFinite(amount) && amount > 0 ? amount : undefined;
    const [amountText, setAmountText] = useState(() => {
        // A link states its amount in its own currency; reinterpreting it in the account's would change the price.
        if (prefill === undefined || (account !== null && currency !== undefined && currency !== account.currency)) {
            return "";
        }
        return numberToNumpad(prefill, minorUnitsFor(currency ?? account?.currency ?? DEFAULT_CURRENCY));
    });
    const [draft, setDraft] = useState<InstallmentDraft | null>(() => {
        if (account === null) {
            return null;
        }
        const fundingId =
            paymentSources(bankAccounts, account.id).find((row) => toAccountKind(row.kind) !== "liability")?.id ?? null;
        return startingDraft(account, lastPlanRows(db, account.id), fundingId);
    });
    const [step, setStep] = useState<Step>(() => {
        if (account === null) {
            return "where";
        }
        return amountText === "" ? "total" : "plan";
    });
    const [category, setCategory] = useState<Category | null>(null);
    const [name, setName] = useState("");
    const [problem, setProblem] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const [forward, setForward] = useState(true);
    const [purchaseDay] = useState(() => new Date());
    const [contentHeight, setContentHeight] = useState<number | null>(null);
    // Set before React re-renders, so two taps inside one commit cannot both place an order.
    const placing = useRef(false);

    useMirror([touched], () => {
        onDirtyChange(touched);
    });

    const fundingFor = (picked: Account) =>
        paymentSources(bankAccounts, picked.id).find((row) => toAccountKind(row.kind) !== "liability")?.id ?? null;

    const termsFor = (picked: Account) => startingDraft(picked, lastPlanRows(db, picked.id), fundingFor(picked));

    const total = numpadToNumber(amountText);
    const funding = account === null ? [] : paymentSources(bankAccounts, account.id);

    const pick = (picked: Account) => {
        setTouched(true);
        setProblem(null);
        setForward(true);
        const typedIn = account?.currency ?? currency;
        if (typedIn !== undefined && typedIn !== picked.currency) {
            setAmountText("");
        }
        setAccount(picked);
        setDraft(termsFor(picked));
        setStep("total");
    };

    const back = () => {
        setForward(false);
        setStep(step === "plan" ? "total" : "where");
    };

    const next = () => {
        if (!(total > 0)) {
            return;
        }
        setTouched(true);
        setProblem(null);
        setForward(true);
        setStep("plan");
    };

    const save = () => {
        if (account === null || draft === null || category === null || saving || placing.current || !(total > 0)) {
            return;
        }
        const schedule = draftSchedule(draft, total, purchaseDay, account.currency);
        if (schedule === null) {
            setProblem(t("installments.nothingLeft"));
            return;
        }
        const upfrontAmount = upfrontOf(draft, total, account.currency);
        const source = funding.find((row) => row.id === draft.upfrontAccountId) ?? null;
        let upfrontSource: PaymentSource | null | undefined;
        if (upfrontAmount > 0) {
            upfrontSource =
                source === null
                    ? null
                    : (paymentSource(
                          upfrontAmount,
                          source,
                          account.currency,
                          paymentRate(db, source.currency, account.currency, purchaseDay)
                      ) ?? undefined);
        }
        if (upfrontAmount > 0 && upfrontSource === undefined) {
            setProblem(t("installments.noRate"));
            return;
        }
        setProblem(null);
        placing.current = true;
        setSaving(true);
        const flow = placeOrder(
            db,
            {
                installmentsPaidOutside: paidBeforeCount(draft, schedule, new Date()),
                purchase: {
                    accountId: account.id,
                    amount: total,
                    categoryId: category.id,
                    currency: account.currency,
                    date: purchaseDay,
                    details: null,
                    income: false,
                    note: name.trim(),
                },
                schedule,
                upfront: schedule.some((row) => row.sequence === 0) ? upfrontSource : undefined,
            },
            [],
            {
                onFeesFailed: () =>
                    notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") }),
                onOrdered: () => undefined,
            }
        ).pipe(
            Effect.tap((id) => rememberSavedEntry(db, account.id, { id, merchant: name.trim() })),
            Effect.tapCause((cause) => Effect.logError("Failed to place the installment purchase", cause)),
            Effect.catch(() => Effect.succeed(null))
        );
        void runFlow(flow).then((result) => {
            if (AsyncResult.isSuccess(result) && result.value !== null) {
                askForInstallmentReminders(db);
                onDone();
                return;
            }
            placing.current = false;
            setSaving(false);
            setProblem(t("installments.failedBody"));
        });
    };

    if (step === "where" || account === null) {
        return (
            <>
                <PurchaseToolbar contentHeight={contentHeight} title={t("installments.new.where")} />
                <NewPurchaseWhere
                    accounts={bankAccounts}
                    onContentHeight={setContentHeight}
                    onPick={pick}
                    selectedId={account?.id ?? null}
                />
            </>
        );
    }

    if (step === "total" || draft === null) {
        return (
            <>
                <PurchaseToolbar contentHeight={contentHeight} onBack={back} title={t("installments.new.total")} />
                <ScrollView
                    className="bg-background flex-1"
                    contentContainerClassName="px-5 pb-safe-offset-10"
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={(_, height) => setContentHeight(height)}
                >
                    <TransactionFormAmountPad
                        code={account.currency}
                        footer={{ label: t("common.next"), onPress: next, tone: total > 0 ? "primary" : "muted" }}
                        forward={forward}
                        label={t("transaction.field.amount")}
                        minorUnits={minorUnitsFor(account.currency)}
                        onChange={(nextText) => {
                            setTouched(true);
                            setProblem(null);
                            setAmountText(nextText);
                        }}
                        showDisplay
                        stepKey="installments-new-total"
                        value={amountText}
                    />
                </ScrollView>
            </>
        );
    }

    return (
        <>
            <PurchaseToolbar contentHeight={contentHeight} onBack={back} title={t("installments.new.plan")} />
            <NewPurchasePlan
                account={account}
                amount={total}
                category={category}
                db={db}
                draft={draft}
                funding={funding}
                name={name}
                onContentHeight={setContentHeight}
                onCategory={(picked) => {
                    setTouched(true);
                    setCategory(picked);
                }}
                onDraft={(nextDraft) => {
                    setTouched(true);
                    setProblem(null);
                    setDraft(nextDraft);
                }}
                onName={(nextName) => {
                    setTouched(true);
                    setName(nextName);
                }}
                onSave={save}
                problem={problem}
                purchaseDay={purchaseDay}
                saving={saving}
            />
        </>
    );
}
