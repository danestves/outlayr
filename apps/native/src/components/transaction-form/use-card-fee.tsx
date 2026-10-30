import { useSelector } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";

import type { Account } from "@/data/accounts-core";
import { recentPaidVia, rememberFeeCategory } from "@/data/card-fees-core";
import type { CardFeeInput } from "@/data/card-fees-core";
import type { Category, CategoryWithChildren } from "@/data/categories-core";
import { useRatesRead } from "@/data/live-query";
import { transactionRateSuggestions } from "@/data/transaction-entry-rates";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { cardFeeAmount, cardFeeBase, cardFeeOf, formatFeeRate, NO_FEE } from "@/domain/card-fee";
import type { FeeDraft } from "@/domain/card-fee";
import { formatAmount, minorUnitsFor, numberLocale } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { PAID_VIA, paidViaCharge, paidViaFee, rememberedPaidVia } from "@/domain/paid-via";
import type { PaidVia } from "@/domain/paid-via";
import { useTranslation, useLanguage } from "@/i18n/context";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { logged } from "@/state/entry-save";
import { useAtomCommand } from "@/state/use-atom-command";

import { AmountNumpad } from "../amount-numpad";
import { Text } from "../text";
import { chargedFee, feeInputOf } from "./card-fee-entry";
import type { EntryFee } from "./card-fee-entry";
import type { EntryForm } from "./form-values";
import type { SentenceVerb } from "./sentence/fact-glyphs";
import { FeeTotal } from "./sentence/fee-total";
import type { TransactionPaidViaClause } from "./sentence/transaction-sentence";
import { StageOptionRow } from "./stage/stage-options";
import type { StageOptionItem } from "./stage/stage-options";
import type { StageNavigation, StageStepContent } from "./stage/stage-steps";
import { StepCategory } from "./stage/step-category";
import { StepFee } from "./stage/step-fee";
import type { StepFeeField } from "./stage/step-fee";
import { useFeeReads } from "./use-fee-reads";

type FeeOptionId = "amount" | "none" | "paidVia" | "percent" | `rate:${number}`;

interface MerchantStore {
    get: () => { values: { merchant: string } };
    subscribe: (listener: (value: { values: { merchant: string } }) => void) => { unsubscribe: () => void };
}

interface FeeForm extends EntryForm {
    readonly store: MerchantStore;
}

interface CardFeeOptions {
    account: Account | null;
    accountTile: ReactNode;
    amountInUsd: (amount: number) => number | null;
    categories: readonly CategoryWithChildren[];
    category: Category | null;
    currency: string;
    date: Date;
    db: Database;
    fee: FeeDraft | null;
    feeCategoryId: string | null;
    form: FeeForm;
    income: boolean;
    initial: Transaction | undefined;
    mode: "create" | "edit";
    paidVia: PaidVia | null;
    stage: StageNavigation;
}

export function useCardFee({
    account,
    accountTile,
    amountInUsd,
    categories,
    category,
    currency,
    date,
    db,
    fee,
    feeCategoryId,
    form,
    income,
    initial,
    mode,
    paidVia,
    stage,
}: CardFeeOptions) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();
    const runFlow = useAtomCommand(voidAppFlowCommand);

    const feeable = !income && initial?.transferId == null && initial?.feeForId == null;
    const foreignCharge = account != null && account.currency !== currency;
    const feeCurrency = account?.currency ?? currency;
    const cardRate = useRatesRead(
        () =>
            feeCurrency === "USD" || feeCurrency === currency
                ? null
                : transactionRateSuggestions(db, feeCurrency, date).official,
        [db, feeCurrency, currency, date]
    );
    const { feeCategory, feeRates, suggestedFeeRate } = useFeeReads({
        account,
        category,
        db,
        feeCategoryId,
        foreignCharge,
        mode,
    });
    const paysBolivares = feeable && currency === "VES" && account?.currency === "VES";
    const paidViaHistory = mode === "create" && account?.currency === "VES" ? recentPaidVia(db, account.id) : null;
    const suggestedPaidVia = useSelector(form.store, (s) =>
        paidViaHistory === null ? null : rememberedPaidVia(paidViaHistory, s.values.merchant)
    );
    const paidViaNow: PaidVia | null = paysBolivares ? (paidVia ?? suggestedPaidVia) : null;
    const followsPaidVia = paysBolivares && fee === null;
    const feeTitle = t(paysBolivares ? "transaction.fee.bankTitle" : "transaction.fee.title");
    const feeDraft: FeeDraft =
        fee ?? (suggestedFeeRate === null ? NO_FEE : { kind: "percent", rate: suggestedFeeRate });
    let cardFee = null;
    if (feeable) {
        cardFee = followsPaidVia ? paidViaFee(paidViaNow) : cardFeeOf(feeDraft);
    }
    const entryFee: EntryFee = { currency: feeCurrency, fee: cardFee, followsPaidVia };
    const feeShown = (): boolean =>
        feeable &&
        (cardFee !== null || (feeDraft.kind === "typed" && (stage.step === "fee" || stage.step === "feeCategory")));
    const feeBase = (amount: number): number | null =>
        cardFeeBase(amount, { card: feeCurrency, entry: currency }, amountInUsd, cardRate);
    const feeAmountFor = (amount: number): number | null => chargedFee(entryFee, feeBase(amount));
    const feeLabel = (amount: number): string | null => {
        if (!feeShown()) {
            return null;
        }
        if (followsPaidVia) {
            const charged = feeAmountFor(amount);
            return charged === null ? null : `+ ${formatAmount(charged, feeCurrency, true, language)}`;
        }
        if (feeDraft.kind === "percent") {
            return `+ ${formatFeeRate(feeDraft.rate, language)}`;
        }
        if (feeDraft.kind === "typed" && feeDraft.unit === "percent") {
            return `+ ${formatFeeRate(numpadToNumber(feeDraft.text) / 100, language)}`;
        }
        return feeDraft.kind === "typed"
            ? `+ ${formatAmount(numpadToNumber(feeDraft.text), feeDraft.currency, true, language)}`
            : null;
    };
    const feeField = (charged: number): StepFeeField | null => {
        if (feeDraft.kind !== "typed") {
            return null;
        }
        return {
            comesTo:
                feeDraft.unit === "percent" && charged > 0
                    ? {
                          amount: formatAmount(charged, feeCurrency, true, language),
                          template: t("transaction.fee.comesTo"),
                      }
                    : null,
            label: feeTitle,
            placeholder: feeDraft.text === "",
            unit: feeDraft.unit === "percent" ? "%" : feeDraft.currency,
            value: feeDraft.text === "" ? "0" : feeDraft.text.replace(".", numberLocale(language).decimal),
        };
    };
    const feeRateChoices =
        feeDraft.kind === "percent" && !feeRates.includes(feeDraft.rate)
            ? [...feeRates, feeDraft.rate].sort((a, b) => a - b)
            : feeRates;
    const feeSelectedId = (): FeeOptionId => {
        if (followsPaidVia && cardFee !== null) {
            return "paidVia";
        }
        if (feeDraft.kind === "typed") {
            return feeDraft.unit;
        }
        return feeDraft.kind === "percent" ? `rate:${feeDraft.rate}` : "none";
    };

    const steps = {
        fee: (amountNumber: number): StageStepContent => {
            const base = feeBase(amountNumber);
            const charged = feeAmountFor(amountNumber) ?? 0;
            const paidViaCharged = paidViaCharge(paidViaNow, amountNumber);
            const options: StageOptionItem<FeeOptionId>[] = [
                ...(paidViaNow === null || paidViaFee(paidViaNow) === null
                    ? []
                    : [
                          {
                              id: "paidVia" as const,
                              label: t(`transaction.paidVia.option.${paidViaNow}`),
                              trailing:
                                  paidViaCharged === null ? undefined : (
                                      <Text className="text-label text-muted font-mono tabular-nums">
                                          {formatAmount(paidViaCharged, "VES", true, language)}
                                      </Text>
                                  ),
                          },
                      ]),
                { id: "none", label: t("transaction.fee.none") },
                ...feeRateChoices.map((rate) => {
                    const percent = formatFeeRate(rate, language);
                    const money =
                        base === null
                            ? null
                            : formatAmount(
                                  cardFeeAmount({ kind: "percent", rate }, base, feeCurrency),
                                  feeCurrency,
                                  true,
                                  language
                              );
                    return {
                        accessibilityLabel: money === null ? percent : `${percent}, ${money}`,
                        id: `rate:${rate}` as const,
                        label: percent,
                        trailing:
                            money === null ? undefined : (
                                <Text className="text-label text-muted font-mono tabular-nums">{money}</Text>
                            ),
                    };
                }),
                { id: "percent", label: t("transaction.fee.percent") },
                { id: "amount", label: t("transaction.fee.amount") },
            ];
            return {
                body: (
                    <StepFee
                        field={feeField(charged)}
                        labels={{
                            loggedAs: t("transaction.fee.loggedAs"),
                            total:
                                account == null
                                    ? t("transaction.fee.total")
                                    : t("transaction.fee.pays", { account: account.name }),
                        }}
                        loggedAs={feeCategory?.name ?? t("transaction.sentence.blank.category")}
                        onLoggedAsPress={() => stage.enter("feeCategory")}
                        onSelect={(id) => {
                            if (id === "paidVia") {
                                form.setFieldValue("fee", null);
                                stage.leave("amount");
                                return;
                            }
                            if (id === "percent") {
                                form.setFieldValue("fee", { kind: "typed", text: "", unit: "percent" });
                                return;
                            }
                            if (id === "amount") {
                                form.setFieldValue("fee", {
                                    currency: feeCurrency,
                                    kind: "typed",
                                    text: "",
                                    unit: "amount",
                                });
                                return;
                            }
                            form.setFieldValue(
                                "fee",
                                id === "none" ? NO_FEE : { kind: "percent", rate: Number(id.slice("rate:".length)) }
                            );
                            stage.leave("amount");
                        }}
                        options={options}
                        selectedId={feeSelectedId()}
                        total={base === null ? null : formatAmount(base + charged, feeCurrency, true, language)}
                    >
                        {feeDraft.kind === "typed" ? (
                            <AmountNumpad
                                code={feeDraft.unit === "percent" ? "%" : feeDraft.currency}
                                minorUnits={feeDraft.unit === "percent" ? 2 : minorUnitsFor(feeDraft.currency)}
                                mode={feeDraft.unit === "percent" ? "explicitSeparator" : undefined}
                                onChange={(text) => form.setFieldValue("fee", { ...feeDraft, text })}
                                showDisplay={false}
                                value={feeDraft.text}
                            />
                        ) : null}
                    </StepFee>
                ),
                title: feeTitle,
            };
        },
        feeCategory: (): StageStepContent => ({
            body: (
                <StepCategory
                    categories={categories}
                    onCreate={() => router.push("/settings/categories/create")}
                    onSelect={(picked) => {
                        form.setFieldValue("feeCategoryId", picked.id);
                        void runFlow(
                            rememberFeeCategory(db, picked.id).pipe(logged("Failed to remember the fee category"))
                        );
                        stage.leave("fee");
                    }}
                    selectedId={feeCategory?.id ?? null}
                />
            ),
            title: t("transaction.fee.loggedAs"),
        }),
        paidVia: (amountNumber: number): StageStepContent => {
            const options = PAID_VIA.map((via) => {
                const charged = paidViaCharge(via, amountNumber);
                return {
                    id: via,
                    label: t(`transaction.paidVia.option.${via}`),
                    trailing:
                        charged === null ? undefined : (
                            <Text className="text-label text-muted font-mono tabular-nums">
                                {formatAmount(charged, "VES", true, language)}
                            </Text>
                        ),
                };
            });
            return {
                body: (
                    <StageOptionRow
                        onSelect={(via) => {
                            form.setFieldValue("paidVia", via);
                            form.setFieldValue("fee", null);
                            stage.leave("amount");
                        }}
                        options={options}
                        selectedId={paidViaNow}
                    />
                ),
                title: t("transaction.paidVia.title"),
            };
        },
    };

    const verbs: SentenceVerb[] =
        feeable && !feeShown()
            ? [
                  {
                      accessibilityLabel: t("transaction.sentence.add.label", {
                          fact: t("transaction.sentence.add.fee"),
                      }),
                      active: false,
                      key: "fee",
                      label: t("transaction.sentence.add.fee"),
                      onPress: () => stage.enter("fee"),
                  },
              ]
            : [];

    const paidViaClause: TransactionPaidViaClause | undefined = paysBolivares
        ? {
              blank: t("transaction.sentence.blank.paidVia"),
              field: t("transaction.paidVia.title"),
              onPress: () => stage.enter("paidVia"),
              template: t(paidViaNow === "cash" ? "transaction.sentence.paidViaCash" : "transaction.sentence.paidVia"),
              value: paidViaNow === null ? null : t(`transaction.paidVia.value.${paidViaNow}`),
          }
        : undefined;

    const line = (amountNumber: number): ReactNode => {
        const base = feeBase(amountNumber);
        const charged = feeAmountFor(amountNumber);
        return charged === null || base === null ? undefined : (
            <FeeTotal
                account={account?.name ?? null}
                accountTile={accountTile}
                base={base}
                code={feeCurrency}
                fee={charged}
                onPress={() => stage.enter("fee")}
            />
        );
    };

    return {
        input: (merchant: string, purchaseCategoryId: string | null, amount: number): CardFeeInput | null | undefined =>
            feeInputOf(entryFee, initial, feeBase(amount), {
                categoryId: feeCategory?.id ?? purchaseCategoryId,
                note: t("transaction.fee.note", { merchant }),
            }),
        label: feeLabel,
        line,
        paidVia: paidViaClause,
        savedPaidVia: (chosen: PaidVia | null) => (paysBolivares ? (chosen ?? suggestedPaidVia) : null),
        steps,
        title: feeTitle,
        verbs,
    };
}
