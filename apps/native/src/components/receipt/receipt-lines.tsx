import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { formatAmount } from "@/domain/money";
import type { StoredReceipt } from "@/domain/receipt-items";
import { formatQuantity } from "@/domain/receipt-scan";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

const LINE_STAGGER_MS = 34;
const LINE_STAGGER_MAX_MS = 560;

function LineRow({
    currency,
    index,
    language,
    line,
    last,
    staggered,
}: {
    currency: string;
    index: number;
    language: Language;
    line: StoredReceipt["items"][number];
    last: boolean;
    staggered: boolean;
}) {
    const delay = Math.min(LINE_STAGGER_MAX_MS, 80 + index * LINE_STAGGER_MS);
    return (
        <Animated.View
            className={`flex-row items-baseline gap-3 py-2.5 ${last ? "" : "border-separator border-b"}`}
            entering={staggered ? FadeInDown.delay(delay).duration(240) : undefined}
        >
            <Text className="text-foreground flex-1 font-sans text-base" numberOfLines={1}>
                {line.quantity === 1 ? null : (
                    <Text className="text-muted font-sans-medium tabular-nums">{formatQuantity(line.quantity)}× </Text>
                )}
                {line.name}
            </Text>
            <Text className="text-foreground font-sans-medium text-base tabular-nums">
                {formatAmount(line.price, currency, true, language)}
            </Text>
        </Animated.View>
    );
}

function SummaryRow({
    delay,
    emphasis = false,
    label,
    staggered,
    value,
}: {
    delay: number;
    emphasis?: boolean;
    label: string;
    staggered: boolean;
    value: string;
}) {
    return (
        <Animated.View
            className="flex-row items-baseline gap-3 py-1.5"
            entering={staggered ? FadeInDown.delay(delay).duration(240) : undefined}
        >
            <Text
                className={`flex-1 font-sans text-base ${emphasis ? "font-sans-semibold text-foreground" : "text-muted"}`}
            >
                {label}
            </Text>
            <Text
                className={`text-base tabular-nums ${emphasis ? "font-sans-semibold text-foreground" : "text-muted font-sans"}`}
            >
                {value}
            </Text>
        </Animated.View>
    );
}

interface ReceiptLinesProps extends Omit<StoredReceipt, "items"> {
    currency: string;
    items: readonly StoredReceipt["items"][number][];
    staggered?: boolean;
    total: number;
    visibleLines?: number;
}

export function ReceiptLines({
    currency,
    items,
    staggered = false,
    subtotal,
    tax,
    tip,
    total,
    visibleLines,
}: ReceiptLinesProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const shown = expanded || visibleLines === undefined ? items : items.slice(0, visibleLines);
    const money = (value: number) => formatAmount(value, currency, true, language);
    const summary: { emphasis?: boolean; key: string; label: string; value: number }[] = [];
    if (subtotal !== null) {
        summary.push({ key: "subtotal", label: t("receipt.review.subtotal"), value: subtotal });
    }
    if (tax !== null) {
        summary.push({ key: "tax", label: t("receipt.review.tax"), value: tax });
    }
    if (tip !== null) {
        summary.push({ key: "tip", label: t("receipt.review.tip"), value: tip });
    }
    summary.push({ emphasis: true, key: "total", label: t("receipt.review.total"), value: total });
    const summaryDelay = Math.min(LINE_STAGGER_MAX_MS, 80 + shown.length * LINE_STAGGER_MS) + 40;

    return (
        <View className="gap-6">
            {items.length > 0 ? (
                <View>
                    <Animated.View
                        className="border-separator flex-row items-baseline border-b pb-2"
                        entering={staggered ? FadeIn.delay(60).duration(200) : undefined}
                    >
                        <Text className="text-muted text-footnote flex-1 font-sans">
                            {t("receipt.items", { count: items.length })}
                        </Text>
                        <Text className="text-subtle text-footnote font-sans">{currency}</Text>
                    </Animated.View>
                    {shown.map((line, index) => (
                        <LineRow
                            currency={currency}
                            index={index}
                            key={`${index}-${line.name}`}
                            language={language}
                            last={index === shown.length - 1 && shown.length === items.length}
                            line={line}
                            staggered={staggered}
                        />
                    ))}
                    {shown.length < items.length ? (
                        <Pressable
                            accessibilityRole="button"
                            className="py-2.5"
                            hitSlop={8}
                            onPress={() => setExpanded(true)}
                        >
                            <Text className="text-tint font-sans-medium text-base">
                                {t("receipt.items.showAll", { count: items.length })}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            <View className="border-separator border-t pt-2">
                {summary.map((row, index) => (
                    <SummaryRow
                        delay={summaryDelay + index * LINE_STAGGER_MS}
                        emphasis={row.emphasis}
                        key={row.key}
                        label={row.label}
                        staggered={staggered}
                        value={money(row.value)}
                    />
                ))}
            </View>
        </View>
    );
}
