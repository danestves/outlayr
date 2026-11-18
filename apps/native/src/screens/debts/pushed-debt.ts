import type { NotificationDebt } from "@/domain/meta-values";
import { formatAmount } from "@/domain/money";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

const VERB_KEY = {
    borrowed: "debts.verb.borrowed",
    gotPaidBack: "debts.pushed.gotPaidBack",
    lent: "debts.verb.lent",
    paidBack: "debts.pushed.paidBack",
} as const;

interface Wording {
    currency: string;
    language: Language;
    showCents: boolean;
    t: TranslateFn;
}

export function pushedDebtRow(debt: NotificationDebt, { currency, language, showCents, t }: Wording) {
    const { installment } = debt;
    let step: string | null = null;
    if (installment !== null) {
        step =
            installment.of === null
                ? t("debts.pushed.installmentNumber", { index: installment.number })
                : t("debts.pushed.installment", { count: installment.of, index: installment.number });
    }
    return {
        amount: formatAmount(debt.amount, debt.currency ?? currency, showCents, language),
        positive: debt.verb === "lent" || debt.verb === "gotPaidBack",
        subtitle: [t(VERB_KEY[debt.verb]), step, debt.source].filter(Boolean).join(" · "),
        title: debt.counterparty ?? t("debts.pushed.someone"),
    };
}
