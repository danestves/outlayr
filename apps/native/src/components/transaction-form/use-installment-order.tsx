import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { toAccountKind } from "@outlayr/money/account-kind";
import type { EntryRateType } from "@outlayr/money/rates";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import type { Account } from "@/data/accounts-core";
import { paymentRate, planIdForPurchase } from "@/data/installment-reads";
import { installmentsRepo, liveInstallmentsQuery } from "@/data/installments-core";
import type { PaymentSource } from "@/data/installments-core";
import type { Transaction, TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { draftSchedule, newInstallmentDraft, paidBeforeCount, planPrice, upfrontOf } from "@/domain/installment-draft";
import type { InstallmentDraft } from "@/domain/installment-draft";
import { paymentSource, paymentSources } from "@/domain/installment-payment";
import type { InstallmentSeed } from "@/domain/installment-scan";
import { formatAmount } from "@/domain/money";
import { transactionRateError } from "@/domain/transaction-entry-rate";
import { useLanguage, useTranslation } from "@/i18n/context";
import { askForInstallmentReminders } from "@/lib/due-reminders";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { notifyFailure } from "@/lib/notify";

import { InstallmentsSheet } from "./installments-sheet";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface InstallmentOrderArgs {
    account: Account | null;
    banks: readonly Account[];
    currency: string;
    date: Date;
    db: Database;
    /** Prices a plan in dollars. */
    entryRate: { rate: number | null; type: EntryRateType };
    income: boolean;
    initial: Transaction | undefined;
    intent: boolean;
    isSubscription: boolean;
    mode: "create" | "edit";
    seeded: InstallmentSeed | undefined;
}

// Editing an entry that has an order opens the order instead: its rows are edited there, never regenerated here.
export function useInstallmentOrder({
    account,
    banks,
    currency,
    date,
    db,
    entryRate,
    income,
    initial,
    intent,
    isSubscription,
    mode,
    seeded,
}: InstallmentOrderArgs) {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const sheetRef = useRef<BottomSheetModal>(null);
    const ordered = useRef(false);
    const prompted = useRef(!intent);
    const [draft, setDraft] = useState<InstallmentDraft | null>(null);
    // Presented from an effect: the sheet mounts with the draft, a render after the tap that makes it.
    const [presented, setPresented] = useState(0);
    const [planId] = useState(() => (initial ? planIdForPurchase(db, initial.id) : null));
    const sources = paymentSources(banks, account?.id);
    const from = sources.find((bank) => bank.id === draft?.upfrontAccountId) ?? null;
    const offered =
        mode === "create" &&
        account !== null &&
        toAccountKind(account.kind) === "liability" &&
        !income &&
        !isSubscription;
    // The purchase stays in its own currency; the plan is in the account's.
    const planCurrency = account?.currency ?? currency;
    const planPriceOf = (price: number, rate = entryRate.rate) =>
        planPrice({ amount: price, currency, date, rateType: entryRate.type }, planCurrency, {
            entryRate: rate,
            planPerUsd: currency === planCurrency ? null : paymentRate(db, "USD", planCurrency, date),
        });

    useEffect(() => {
        if (presented > 0) {
            sheetRef.current?.present();
        }
    }, [presented]);

    const open = () => {
        prompted.current = true;
        setDraft(
            (current) =>
                current ??
                seeded?.draft ??
                newInstallmentDraft(sources.find((source) => toAccountKind(source.kind) !== "liability")?.id ?? null)
        );
        setPresented((count) => count + 1);
    };

    const prompt = (hasPrice: boolean) => {
        if (!prompted.current && offered && hasPrice) {
            open();
        }
    };

    const verbs = (hasPrice: boolean, price: number): SentenceVerb[] => {
        if (planId !== null) {
            return [
                {
                    active: true,
                    key: "installments",
                    label: t("installments.order"),
                    onPress: () => router.push({ params: { planId }, pathname: "/installments/[planId]" }),
                },
            ];
        }
        if (!offered) {
            return [];
        }
        const plan = planPriceOf(price);
        const first =
            draft === null || plan === null
                ? null
                : draftSchedule(draft, plan, date, planCurrency)?.find((row) => row.sequence > 0);
        return [
            {
                active: draft !== null,
                disabled: !hasPrice,
                key: "installments",
                label:
                    draft && first
                        ? t("installments.chipSet", {
                              amount: formatAmount(first.amount, planCurrency, true, language),
                              count: draft.count,
                          })
                        : t("installments.chip"),
                onPress: open,
                onRemove: () => setDraft(null),
                removeAccessibilityLabel: t("installments.chip"),
            },
        ];
    };

    /** Null when paid outside Outlayr; undefined while it cannot be converted. */
    const upfrontSource = (plan: number): PaymentSource | null | undefined => {
        if (from === null) {
            return null;
        }
        const upfront = draft === null ? 0 : upfrontOf(draft, plan, planCurrency);
        return (
            paymentSource(upfront, from, planCurrency, paymentRate(db, from.currency, planCurrency, date)) ?? undefined
        );
    };

    /** Opens the sheet on the answer. */
    const problem = (price: number): string | null => {
        if (!offered || draft === null) {
            return null;
        }
        const plan = planPriceOf(price);
        let reason: string | null = null;
        if (plan === null) {
            reason = t("installments.noRate");
        } else if (draftSchedule(draft, plan, date, planCurrency) === null) {
            reason = t("installments.nothingLeft");
        } else if (upfrontOf(draft, plan, planCurrency) > 0 && upfrontSource(plan) === undefined) {
            reason = t("installments.noRate");
        }
        if (reason !== null) {
            sheetRef.current?.present();
        }
        return reason;
    };

    const addSeededFees = async (orderPlanId: string, paidOutside: number) => {
        const cuotas = liveInstallmentsQuery(db)
            .all()
            .filter((row) => row.planId === orderPlanId);
        try {
            await Promise.all(
                (seeded?.fees ?? []).map(async (fee) => {
                    const cuota = cuotas.find((row) => row.sequence === fee.sequence);
                    if (cuota === undefined) {
                        return;
                    }
                    const charged = new Date(Math.min(cuota.dueDate.getTime(), Date.now()));
                    await installmentsRepo.addFee(db, { amount: fee.amount, date: charged, installmentId: cuota.id });
                    if (fee.sequence <= paidOutside) {
                        await installmentsRepo.recordPayment(db, {
                            amount: fee.amount,
                            date: charged,
                            planId: orderPlanId,
                            source: null,
                        });
                    }
                })
            );
        } catch (error) {
            console.error("Failed to save a scanned late fee", error);
            notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
        }
    };

    /** Null when installments are off. */
    const save = (
        input: TransactionInput,
        price: number,
        inSameTransaction: (id: string) => Promise<void>
    ): Promise<string> | null => {
        const plan = planPriceOf(price, input.exchangeRate ?? entryRate.rate);
        const schedule =
            offered && draft !== null && plan !== null ? draftSchedule(draft, plan, date, planCurrency) : null;
        if (account === null || draft === null || plan === null || schedule === null) {
            return null;
        }
        const hasUpfront = schedule.some((row) => row.sequence === 0);
        const paidOutside = paidBeforeCount(draft, schedule, new Date());
        return installmentsRepo
            .createOrder(db, {
                inSameTransaction,
                installmentsPaidOutside: paidOutside,
                purchase: { ...input, accountId: account.id },
                schedule,
                upfront: hasUpfront ? upfrontSource(plan) : undefined,
            })
            .then(async ({ planId: orderPlanId, transactionId }) => {
                ordered.current = true;
                await addSeededFees(orderPlanId, paidOutside);
                rearmInstallmentReminders(db);
                return transactionId;
            });
    };

    /** Fire after the form's `onDone`; true when it asks about cuota notices. */
    const afterDone = () => ordered.current && askForInstallmentReminders(db);

    const sheet = (price: number) => {
        if (!offered || draft === null) {
            return null;
        }
        const plan = planPriceOf(price);
        return (
            <InstallmentsSheet
                accounts={sources}
                currency={planCurrency}
                draft={draft}
                entryRateMissing={
                    transactionRateError(currency, {
                        exchangeRate: entryRate.rate,
                        exchangeRateType: entryRate.type,
                    }) !== null
                }
                fees={seeded?.fees ?? []}
                onChange={setDraft}
                price={plan}
                purchaseDay={date}
                ref={sheetRef}
                schedule={plan === null ? null : draftSchedule(draft, plan, date, planCurrency)}
            />
        );
    };

    return { afterDone, drafting: draft !== null, problem, prompt, save, sheet, verbs };
}
