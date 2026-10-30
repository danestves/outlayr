import { formatAmount, symbolIsShared } from "@/domain/money";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import type { TransactionSentenceLabels } from "./transaction-sentence";

interface SentenceLabelFacts {
    accountDeclined: boolean;
    currency: string;
    feeTitle: string;
    income: boolean;
    language: Language;
}

export function sentenceLabelsOf(
    t: TranslateFn,
    { accountDeclined, currency, feeTitle, income, language }: SentenceLabelFacts
): TransactionSentenceLabels {
    return {
        account: {
            blank: t(accountDeclined ? "transaction.sentence.noAccount" : "transaction.sentence.blank.account"),
            field: t("transaction.field.account"),
        },
        amount: { blank: formatAmount(0, currency, true, language), field: t("transaction.field.amount") },
        category: { blank: t("transaction.sentence.blank.category"), field: t("transaction.field.category") },
        currency: { code: symbolIsShared(currency) ? currency : null, field: t("transaction.sentence.currency") },
        fee: { field: feeTitle },
        kind: {
            switchLabel: t("transaction.sentence.kind.switch"),
            verb: t(income ? "transaction.sentence.kind.income" : "transaction.sentence.kind.expense"),
        },
        merchant: {
            field: t("transaction.field.name"),
            placeholder: t(income ? "transaction.sentence.blank.payer" : "transaction.sentence.blank.merchant"),
        },
        optional: t("transaction.sentence.optional"),
        rate: {
            blank: t("transaction.sentence.blank.rate"),
            converted: t("transaction.rate.inDollars"),
            field: t("transaction.rate.title"),
            source: t("transaction.rate.source"),
        },
        // Uninterpolated: with no params `t` returns the template, which `parseSentence` reads the slot order from.
        template: t(income ? "transaction.sentence.income" : "transaction.sentence.expense"),
        when: { field: t("transaction.field.date") },
    };
}
