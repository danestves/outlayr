import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { toAccountKind } from "@outlayr/money/account-kind";
import { draftSchedule, paidBeforeCount, planPrice, upfrontOf } from "@outlayr/money/installment-draft";
import type { InstallmentDraft } from "@outlayr/money/installment-draft";
import type { EntryRateType } from "@outlayr/money/rates";
import type * as Effect from "effect/Effect";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import type { Account } from "@/data/accounts-core";
import { paymentRate, planIdForPurchase } from "@/data/installment-reads";
import type { PaymentSource } from "@/data/installments-core";
import type { Transaction, TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { paymentSource, paymentSources } from "@/domain/installment-payment";
import type { InstallmentSeed } from "@/domain/installment-scan";
import { formatAmount } from "@/domain/money";
import { transactionRateError } from "@/domain/transaction-entry-rate";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useMirror } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { placeOrder } from "@/state/installment-orders";
import { askForInstallmentReminders } from "@/state/surfaces-commands";

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
    hasPrice: boolean;
    income: boolean;
    initial: Transaction | undefined;
    intent: boolean;
    isSubscription: boolean;
    mode: "create" | "edit";
    seeded: InstallmentSeed | undefined;
    turn: number;
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
    hasPrice: priced,
    isSubscription,
    mode,
    seeded,
    turn,
}: InstallmentOrderArgs) {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const sheetRef = useRef<BottomSheetModal>(null);
    const ordered = useRef(false);
    const [prompted, setPrompted] = useState(!intent);
    const [seenTurn, setSeenTurn] = useState<number | null>(null);
    const [draft, setDraft] = useState<InstallmentDraft | null>(null);
    // The sheet mounts with the draft, a render after the tap that makes it.
    const [presented, setPresented] = useState(0);
    const [planId] = useState(() => (initial ? planIdForPurchase(db, initial.id) : null));
    const sources = paymentSources(banks, account?.id);
    const from = sources.find((bank) => bank.id === draft?.upfrontAccountId) ?? null;
    const offered =
        mode === "create" &&
        !income &&
        !isSubscription &&
        (seeded === undefined || (account !== null && toAccountKind(account.kind) === "liability"));
    // The purchase stays in its own currency; the plan is in the account's.
    const planCurrency = account?.currency ?? currency;
    const planPriceOf = (price: number, rate: number | null) =>
        planPrice({ amount: price, currency, date, rateType: entryRate.type }, planCurrency, {
            entryRate: rate,
            planPerUsd: currency === planCurrency ? null : paymentRate(db, "USD", planCurrency, date),
        });

    useMirror([presented], () => {
        if (presented > 0) {
            sheetRef.current?.present();
        }
    });

    const open = (price?: number) => {
        setPrompted(true);
        if (seeded === undefined) {
            const liability = account !== null && toAccountKind(account.kind) === "liability";
            const planAmount = price === undefined || !liability ? price : planPriceOf(price, entryRate.rate);
            router.push({
                params: {
                    accountId: liability ? account.id : undefined,
                    amount: planAmount === undefined || planAmount === null ? undefined : String(planAmount),
                    currency: liability ? account.currency : currency,
                },
                pathname: "/installments/new",
            });
            return;
        }
        if (draft === null) {
            setDraft(seeded.draft);
        }
        setPresented((count) => count + 1);
    };

    if (turn !== seenTurn) {
        setSeenTurn(turn);
        if (!prompted && offered && priced && seeded !== undefined) {
            open();
        }
    }

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
        if (seeded === undefined) {
            return [
                {
                    active: false,
                    disabled: !hasPrice,
                    key: "installments",
                    label: t("installments.chip"),
                    onPress: () => open(price),
                },
            ];
        }
        const plan = planPriceOf(price, entryRate.rate);
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
                onPress: () => open(),
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
        const plan = planPriceOf(price, entryRate.rate);
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

    /** Null when installments are off. */
    const save = <E,>(
        input: TransactionInput,
        price: number,
        inSameTransaction: (id: string) => Effect.Effect<void, E>
    ) => {
        const plan = planPriceOf(price, input.exchangeRate ?? entryRate.rate);
        const schedule =
            offered && draft !== null && plan !== null ? draftSchedule(draft, plan, date, planCurrency) : null;
        if (account === null || draft === null || plan === null || schedule === null) {
            return null;
        }
        const hasUpfront = schedule.some((row) => row.sequence === 0);
        const paidOutside = paidBeforeCount(draft, schedule, new Date());
        return placeOrder(
            db,
            {
                inSameTransaction,
                installmentsPaidOutside: paidOutside,
                purchase: { ...input, accountId: account.id },
                schedule,
                upfront: hasUpfront ? upfrontSource(plan) : undefined,
            },
            seeded?.fees ?? [],
            {
                onFeesFailed: () => {
                    notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
                },
                onOrdered: () => {
                    ordered.current = true;
                },
            }
        );
    };

    /** Fire after the form's `onDone`; true when it asks about cuota notices. */
    const afterDone = () => ordered.current && askForInstallmentReminders(db);

    const sheet = (price: number) => {
        if (!offered || draft === null) {
            return null;
        }
        const plan = planPriceOf(price, entryRate.rate);
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

    return { afterDone, drafting: draft !== null, problem, save, sheet, verbs };
}
