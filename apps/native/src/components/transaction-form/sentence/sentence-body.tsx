import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { revealEntering } from "../../sentence/sentence-motion";
import type { SentenceFigure } from "../../sentence/sentence-value";
import { FactChips } from "./fact-chips";
import type { SentenceFactKey, SentenceVerb } from "./fact-glyphs";
import type { TransactionSentenceMark } from "./slots";
import { TransactionSentence } from "./transaction-sentence";
import type {
    TransactionPaidViaClause,
    TransactionRateClause,
    TransactionSentenceLabels,
} from "./transaction-sentence";

const REST_FACTS: ReadonlySet<SentenceFactKey> = new Set(["repeat", "tags"]);

interface SentenceBodyProps {
    account: string | null;
    accountTile?: ReactNode;
    activeSlot?: TransactionSentenceMark | null;
    amount: string | null;
    amountFigure?: SentenceFigure;
    amountFlagged?: boolean;
    amountShake?: boolean;
    category: string | null;
    categoryFlagged: boolean;
    categoryPending: boolean;
    categoryShake: boolean;
    categoryTile?: ReactNode;
    /** `RNHostView matchContents` sizes an unconstrained child against the screen, so the sentence needs its box. */
    contentWidth: number;
    feeLine?: ReactNode;
    extras: readonly string[];
    fee: string | null;
    labels: TransactionSentenceLabels;
    merchant: string | null;
    merchantTile?: ReactNode;
    onAccountPress: () => void;
    coach?: ReactNode;
    onAmountPress: () => void;
    onCategoryPress: () => void;
    onCurrencyPress: () => void;
    onFeePress: () => void;
    onKindPress: () => void;
    onLayout?: (height: number) => void;
    onMerchantPress: () => void;
    onWhenPress: () => void;
    paidVia?: TransactionPaidViaClause;
    rate?: TransactionRateClause;
    rest?: { addAccessibilityLabel: string; addLabel: string; onWake: () => void };
    verbs: readonly SentenceVerb[];
    when: string;
}

export function TransactionSentenceBody({
    account,
    accountTile,
    activeSlot = null,
    amount,
    amountFigure,
    amountFlagged,
    amountShake,
    category,
    categoryFlagged,
    categoryPending,
    categoryShake,
    categoryTile,
    coach,
    contentWidth,
    extras,
    fee,
    feeLine,
    labels,
    merchant,
    merchantTile,
    onAccountPress,
    onAmountPress,
    onCategoryPress,
    onCurrencyPress,
    onFeePress,
    onKindPress,
    onLayout,
    onMerchantPress,
    onWhenPress,
    paidVia,
    rate,
    rest,
    verbs,
    when,
}: SentenceBodyProps) {
    const chips: readonly SentenceVerb[] =
        rest === undefined
            ? verbs
            : [
                  ...verbs
                      .filter((verb) => verb.active && REST_FACTS.has(verb.key))
                      .map((verb) => ({
                          ...verb,
                          onPress: () => {
                              rest.onWake();
                              verb.onPress();
                          },
                          onRemove: undefined,
                      })),
                  {
                      accessibilityLabel: rest.addAccessibilityLabel,
                      active: false,
                      key: "add",
                      label: rest.addLabel,
                      onPress: rest.onWake,
                  },
              ];

    return (
        <View
            className="pt-8"
            onLayout={(event) => onLayout?.(event.nativeEvent.layout.height)}
            style={{ width: contentWidth }}
        >
            <TransactionSentence
                account={account}
                accountTile={accountTile}
                activeSlot={activeSlot}
                amount={amount}
                amountFigure={amountFigure}
                amountFlagged={amountFlagged}
                amountShake={amountShake}
                category={category}
                categoryFlagged={categoryFlagged}
                categoryPending={categoryPending}
                categoryShake={categoryShake}
                categoryTile={categoryTile}
                fee={fee}
                labels={labels}
                merchant={merchant}
                merchantTile={merchantTile}
                onAccountPress={onAccountPress}
                onAmountPress={onAmountPress}
                onCategoryPress={onCategoryPress}
                onCurrencyPress={onCurrencyPress}
                onFeePress={onFeePress}
                onKindPress={onKindPress}
                onMerchantPress={onMerchantPress}
                onWhenPress={onWhenPress}
                paidVia={paidVia}
                rate={rate}
                when={when}
            />

            {feeLine === undefined ? null : (
                <Animated.View className="mt-5" entering={revealEntering()}>
                    {feeLine}
                </Animated.View>
            )}

            {extras.length > 0 ? (
                <View className="mt-5 gap-1">
                    {extras.map((extra) => (
                        <Animated.Text className="text-muted text-subtitle" entering={revealEntering()} key={extra}>
                            {extra}
                        </Animated.Text>
                    ))}
                </View>
            ) : null}

            {coach === undefined ? null : (
                <Animated.View className="mt-5" entering={revealEntering()}>
                    {coach}
                </Animated.View>
            )}

            <FactChips chips={chips} />
        </View>
    );
}
