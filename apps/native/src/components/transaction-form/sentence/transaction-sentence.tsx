import type { ReactNode } from "react";
import { View } from "react-native";

import { Sentence } from "../../sentence/sentence";
import { SentenceBlank } from "../../sentence/sentence-blank";
import { SentenceToggle } from "../../sentence/sentence-toggle";
import { SentenceValue } from "../../sentence/sentence-value";
import type { SentenceFigure } from "../../sentence/sentence-value";
import { CurrencyCode } from "./currency-code";
import { continueSentence } from "./slots";
import type { TransactionRateSlot, TransactionSentenceMark, TransactionSentenceSlot } from "./slots";

export interface TransactionSentenceLabels {
    account: { blank: string; field: string };
    amount: { blank: string; field: string };
    category: { blank: string; field: string };
    currency: { code: string | null; field: string };
    fee: { field: string };
    kind: { switchLabel: string; verb: string };
    merchant: { field: string; placeholder: string };
    optional: string;
    rate: { blank: string; converted: string; field: string; source: string };
    template: string;
    when: { field: string };
}

export interface TransactionRateClause {
    converted: { amount: number; text: string } | null;
    flagged: boolean;
    missing: boolean;
    onConvertedPress: () => void;
    onSourcePress: () => void;
    shake: boolean;
    source: string;
    template: string;
}

export interface TransactionPaidViaClause {
    blank: string;
    field: string;
    onPress: () => void;
    template: string;
    value: string | null;
}

interface TransactionSentenceProps {
    account: string | null;
    accountTile?: ReactNode;
    activeSlot: TransactionSentenceMark | null;
    amount: string | null;
    /** Zero is a value, not a blank, so a filled amount can still be what holds the save back. */
    amountFigure?: SentenceFigure;
    amountFlagged?: boolean;
    amountShake?: boolean;
    category: string | null;
    categoryFlagged: boolean;
    categoryPending: boolean;
    categoryShake: boolean;
    categoryTile?: ReactNode;
    fee: string | null;
    labels: TransactionSentenceLabels;
    merchant: string | null;
    merchantTile?: ReactNode;
    onAccountPress: () => void;
    onAmountPress: () => void;
    onCategoryPress: () => void;
    onCurrencyPress: () => void;
    onFeePress: () => void;
    onKindPress: () => void;
    onMerchantPress: () => void;
    onWhenPress: () => void;
    paidVia?: TransactionPaidViaClause;
    rate?: TransactionRateClause;
    when: string;
}

// The template decides where each slot sits, so this names the slots but never their order.
export function TransactionSentence({
    account,
    accountTile,
    activeSlot,
    amount,
    amountFigure,
    amountFlagged,
    amountShake,
    category,
    categoryFlagged,
    categoryPending,
    categoryShake,
    categoryTile,
    fee,
    labels,
    merchant,
    merchantTile,
    onAccountPress,
    onAmountPress,
    onCategoryPress,
    onCurrencyPress,
    onFeePress,
    onKindPress,
    onMerchantPress,
    onWhenPress,
    paidVia,
    rate,
    when,
}: TransactionSentenceProps) {
    let { template } = labels;
    if (rate !== undefined) {
        template = rate.missing ? `${template} ${rate.template}` : continueSentence(template, rate.template);
    }
    let paidViaSlot: ReactNode = null;
    if (paidVia !== undefined) {
        template = `${template} ${paidVia.template}`;
        paidViaSlot =
            paidVia.value === null ? (
                <SentenceBlank
                    accessibilityLabel={paidVia.field}
                    active={activeSlot === "paidVia"}
                    label={paidVia.blank}
                    onPress={paidVia.onPress}
                    optional
                    optionalHint={labels.optional}
                />
            ) : (
                <SentenceValue
                    accessibilityLabel={paidVia.field}
                    active={activeSlot === "paidVia"}
                    onPress={paidVia.onPress}
                    swapKey="paidVia"
                    value={paidVia.value}
                />
            );
    }

    return (
        <Sentence<TransactionRateSlot | TransactionSentenceSlot | "paidVia" | "rate">
            slots={{
                account:
                    account === null ? (
                        <SentenceBlank
                            accessibilityLabel={labels.account.field}
                            active={activeSlot === "account"}
                            label={labels.account.blank}
                            onPress={onAccountPress}
                            optional
                            optionalHint={labels.optional}
                        />
                    ) : (
                        <SentenceValue
                            accessibilityLabel={labels.account.field}
                            active={activeSlot === "account"}
                            onPress={onAccountPress}
                            value={account}
                        >
                            {accountTile}
                        </SentenceValue>
                    ),
                amount: (
                    <View className="flex-row items-baseline gap-1.5">
                        {amount === null ? (
                            <SentenceBlank
                                accessibilityLabel={labels.amount.field}
                                active={activeSlot === "amount"}
                                flagged={amountFlagged}
                                label={labels.amount.blank}
                                onPress={onAmountPress}
                                shake={amountShake}
                            />
                        ) : (
                            <SentenceValue
                                accessibilityLabel={labels.amount.field}
                                active={activeSlot === "amount"}
                                figure={amountFigure}
                                flagged={amountFlagged}
                                onPress={onAmountPress}
                                shake={amountShake}
                                swapKey="amount"
                                value={amount}
                            />
                        )}
                        {labels.currency.code === null ? null : (
                            <CurrencyCode
                                accessibilityLabel={labels.currency.field}
                                code={labels.currency.code}
                                onPress={onCurrencyPress}
                            />
                        )}
                        {fee === null ? null : (
                            <SentenceValue
                                accessibilityLabel={labels.fee.field}
                                active={activeSlot === "fee"}
                                onPress={onFeePress}
                                swapKey="fee"
                                value={fee}
                            />
                        )}
                    </View>
                ),
                category:
                    category === null ? (
                        <SentenceBlank
                            accessibilityLabel={labels.category.field}
                            active={activeSlot === "category"}
                            flagged={categoryFlagged}
                            label={labels.category.blank}
                            onPress={onCategoryPress}
                            shake={categoryShake}
                        />
                    ) : (
                        <SentenceValue
                            accessibilityLabel={labels.category.field}
                            active={activeSlot === "category"}
                            flagged={categoryFlagged}
                            onPress={onCategoryPress}
                            pending={categoryPending}
                            shake={categoryShake}
                            value={category}
                        >
                            {categoryTile}
                        </SentenceValue>
                    ),
                converted:
                    rate?.converted == null ? null : (
                        <SentenceValue
                            accessibilityLabel={labels.rate.converted}
                            active={activeSlot === "converted"}
                            figure={{ amount: rate.converted.amount, code: "USD" }}
                            onPress={rate.onConvertedPress}
                            swapKey="converted"
                            value={rate.converted.text}
                        />
                    ),
                kind: (
                    <SentenceToggle
                        accessibilityLabel={labels.kind.switchLabel}
                        onPress={onKindPress}
                        value={labels.kind.verb}
                    />
                ),
                merchant:
                    merchant === null ? (
                        <SentenceBlank
                            accessibilityLabel={labels.merchant.field}
                            active={activeSlot === "merchant"}
                            label={labels.merchant.placeholder}
                            onPress={onMerchantPress}
                            optional
                            optionalHint={labels.optional}
                        />
                    ) : (
                        <SentenceValue
                            accessibilityLabel={labels.merchant.field}
                            active={activeSlot === "merchant"}
                            onPress={onMerchantPress}
                            value={merchant}
                        >
                            {merchantTile}
                        </SentenceValue>
                    ),
                paidVia: paidViaSlot,
                rate:
                    rate === undefined ? null : (
                        <SentenceBlank
                            accessibilityLabel={labels.rate.field}
                            active={activeSlot === "rateSource"}
                            flagged={rate.flagged}
                            label={labels.rate.blank}
                            onPress={rate.onSourcePress}
                            shake={rate.shake}
                        />
                    ),
                rateSource:
                    rate === undefined ? null : (
                        <SentenceValue
                            accessibilityLabel={labels.rate.source}
                            active={activeSlot === "rateSource"}
                            flagged={rate.flagged}
                            onPress={rate.onSourcePress}
                            shake={rate.shake}
                            value={rate.source}
                        />
                    ),
                when: (
                    <SentenceValue
                        accessibilityLabel={labels.when.field}
                        active={activeSlot === "when"}
                        onPress={onWhenPress}
                        value={when}
                    />
                ),
            }}
            template={template}
        />
    );
}
