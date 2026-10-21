import type { CurrencyBucket } from "@outlayr/money/currency-totals";
import { roundMoney } from "@outlayr/money/round";
import { NumberFlow } from "number-flow-react-native";
import { createContext, Fragment, use } from "react";
import { useWindowDimensions, View } from "react-native";
import { useResolveClassNames } from "uniwind";

import { amountHeroFontSize, SYMBOL_ALLOWANCE } from "@/domain/amount-hero-size";
import { rowAmountLabel } from "@/domain/amount-label";
import type { RowAmountLabelInput } from "@/domain/amount-label";
import { AMOUNT_MASK, amountDigits, amountParts, formatAmount, maskedAmount, withCurrencySymbol } from "@/domain/money";
import type { NumberLocale } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import { HERO_TYPE } from "./hero-type";
import { ROW_TYPE } from "./row-type";
import { FontScaleCapContext, Text } from "./text";
import { cn, tv } from "./tw";

const BASELINE_STRUT = "\u200B";
const HERO_GUTTER = 40;

export const AmountsHiddenContext = createContext(false);

function intlDecimal(tag: string): string {
    return new Intl.NumberFormat(tag, { minimumFractionDigits: 1, useGrouping: false }).format(1.5).charAt(1);
}

interface FlowFigureProps {
    className?: string;
    fontFamily?: string;
    format: Intl.NumberFormatOptions;
    locale: NumberLocale;
    prefix?: string;
    size?: number;
    /** Drawn as plain text after `prefix`, with no digit roll. */
    text?: string;
    value: number;
}

export function FlowFigure({ className, fontFamily, format, locale, prefix, size, text, value }: FlowFigureProps) {
    const resolved = useResolveClassNames(className ?? "");
    const { color, fontSize, fontVariant, fontWeight } = resolved;
    const fontScaleCap = use(FontScaleCapContext);
    const { fontScale } = useWindowDimensions();
    const figureSize = size ?? fontSize;
    const overCap = figureSize !== undefined && fontScaleCap !== undefined && fontScale > fontScaleCap;
    if (text !== undefined) {
        return (
            <Text
                className={className}
                numberOfLines={1}
                style={[size == null ? undefined : { fontSize: size }, fontFamily == null ? undefined : { fontFamily }]}
            >
                {prefix}
                {text}
            </Text>
        );
    }
    return (
        <View className="flex-row items-center">
            <Text
                accessible={false}
                className={className}
                style={[size == null ? undefined : { fontSize: size }, fontFamily == null ? undefined : { fontFamily }]}
            >
                {BASELINE_STRUT}
            </Text>
            <NumberFlow
                format={format}
                locales={locale.tag}
                prefix={prefix}
                style={{
                    color,
                    fontFamily: fontFamily ?? resolved.fontFamily,
                    fontSize: overCap ? (figureSize * fontScaleCap) / fontScale : figureSize,
                    fontVariant,
                    fontWeight,
                }}
                value={value}
            />
        </View>
    );
}

interface FlowAmountProps {
    amount: number;
    className?: string;
    code: string;
    fontFamily?: string;
    prefix?: string;
    showCents: boolean;
    size?: number;
    /** Plain text, for a figure the user is typing or picking. */
    still?: boolean;
}

export function FlowAmount({
    amount,
    className,
    code,
    fontFamily,
    prefix,
    showCents,
    size,
    still = false,
}: FlowAmountProps) {
    const { language } = useLanguage();
    const parts = amountParts(amount, code, showCents, language);
    const { locale, minorUnits } = parts;
    const digits = still ? amountDigits(parts) : undefined;
    return (
        <FlowFigure
            className={className}
            fontFamily={fontFamily}
            format={{ maximumFractionDigits: minorUnits, minimumFractionDigits: minorUnits, useGrouping: true }}
            locale={locale}
            prefix={prefix}
            size={size}
            text={use(AmountsHiddenContext) ? AMOUNT_MASK : digits}
            value={roundMoney(Math.abs(amount), minorUnits)}
        />
    );
}

export function fittedHeroSize(
    size: number,
    amount: number,
    minorUnits: number,
    width: number,
    fontScale: number
): number {
    if (width <= 0) {
        return size;
    }
    const drawn = amountHeroFontSize(amount, minorUnits, width - SYMBOL_ALLOWANCE * (fontScale - 1));
    return Math.min(size, Math.floor(drawn / fontScale));
}

const PLAIN_HERO: typeof HERO_TYPE = { face: {}, scale: 1 };

interface HeroNumberProps {
    /** Signed magnitude; the sign shown is derived unless `sign` is given. */
    amount: number;
    /** Android sets the figure in Instrument Serif (`HERO_TYPE`); iOS is unchanged. */
    brandFace?: boolean;
    code: string;
    showCents?: boolean;
    sign?: "+" | "-" | "";
    size?: number;
    /** Plain text, for a figure the user is typing or picking. */
    still?: boolean;
    toneClass?: string;
}

export function HeroNumber({
    amount,
    brandFace = false,
    code,
    sign,
    toneClass = "text-foreground",
    size = 40,
    still = false,
    showCents = true,
}: HeroNumberProps) {
    // From context, not `amountParts`' `runtimeLanguage()` default: React cannot see that module global, so a
    // language change would leave this printing the old locale.
    const { language } = useLanguage();
    const { fontScale, width: windowWidth } = useWindowDimensions();
    const parts = amountParts(amount, code, showCents, language);
    const resolvedSign = sign ?? (amount < 0 ? "-" : "+");
    const hero = brandFace ? HERO_TYPE : PLAIN_HERO;
    const scaled = size * hero.scale;
    const fitted = fittedHeroSize(scaled, amount, parts.minorUnits, windowWidth - HERO_GUTTER, fontScale);
    const small = (Math.round(scaled * 0.5) * fitted) / scaled;
    const whole = Math.trunc(roundMoney(Math.abs(amount), parts.minorUnits));
    return (
        <View
            accessibilityLabel={`${resolvedSign}${withCurrencySymbol(parts, amountDigits(parts))}`}
            accessibilityRole="text"
            accessible
            className="flex-row items-baseline"
        >
            <Text
                className="tracking-hero text-muted font-sans tabular-nums"
                numberOfLines={1}
                style={{ fontSize: small, ...hero.face }}
            >
                {resolvedSign}
                {parts.symbol}
            </Text>
            <FlowFigure
                className={cn("font-sans tabular-nums", toneClass)}
                fontFamily={hero.face.fontFamily}
                format={{ maximumFractionDigits: 0, useGrouping: true }}
                locale={parts.locale}
                size={fitted}
                text={still ? parts.integer : undefined}
                value={whole}
            />
            {parts.fraction ? (
                <FlowFigure
                    className="text-muted font-sans tabular-nums"
                    fontFamily={hero.face.fontFamily}
                    format={{ minimumIntegerDigits: parts.minorUnits, useGrouping: false }}
                    locale={parts.locale}
                    prefix={intlDecimal(parts.locale.tag)}
                    size={small}
                    text={still ? parts.fraction : undefined}
                    value={Number(parts.fraction)}
                />
            ) : null}
        </View>
    );
}

// Order matters: `isFuture` comes after `income`, so a future-dated income row resolves to `text-future`.
const rowAmount = tv({
    base: `${ROW_TYPE.amount} text-foreground`,
    variants: {
        income: { true: "text-income" },
        isFuture: { true: "text-future" },
        struck: { true: "line-through" },
    },
});

interface RowAmountProps extends RowAmountLabelInput {
    isFuture: boolean;
    struck?: boolean;
    transfer?: boolean;
}

function signFor(income: boolean | null): "+" | "-" {
    return income ? "+" : "-";
}

export function RowAmount({
    amount,
    income,
    isFuture,
    code,
    showCents = true,
    struck = false,
    transfer = false,
    transferSign,
}: RowAmountProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const largeText = useAccessibilityTextSize();
    const sign = transfer ? (transferSign ?? "") : signFor(income);
    return (
        <Text
            // Spelled out: neither the glyph nor the colour is a cue a screen reader can read.
            accessibilityLabel={
                hidden
                    ? t("log.amounts.hidden")
                    : rowAmountLabel({ amount, code, income: transfer ? null : income, showCents, transferSign }, t)
            }
            adjustsFontSizeToFit={largeText}
            className={cn(rowAmount({ income: !transfer && income === true, isFuture, struck }), "tabular-nums")}
            numberOfLines={1}
        >
            {sign}
            {hidden ? maskedAmount(code) : formatAmount(amount, code, showCents, language)}
        </Text>
    );
}

interface MeasureCellAmountProps {
    code: string;
    income: boolean;
    /** Unsigned magnitude; the sign comes from `positive`, not from this. */
    magnitude: number;
    positive: boolean;
    showCents?: boolean;
}

export function MeasureCellAmount({ magnitude, positive, income, code, showCents = true }: MeasureCellAmountProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const toneClass = income ? "text-income" : "text-foreground";
    const amount = `${positive ? "+" : "-"}${hidden ? maskedAmount(code) : formatAmount(magnitude, code, showCents, language)}`;
    return (
        <Text
            accessibilityLabel={hidden ? t("log.amounts.hidden") : amount}
            className={cn(ROW_TYPE.cell, "tabular-nums", toneClass)}
            numberOfLines={1}
        >
            {amount}
        </Text>
    );
}

interface DayTotalProps {
    showCents?: boolean;
    sizeClass?: string;
    /** Signed totals per currency, dominant first. */
    totals: readonly CurrencyBucket[];
}

function signedAmount(amount: number, code: string, showCents: boolean, language: Language, hidden: boolean): string {
    return `${amount < 0 ? "-" : "+"}${hidden ? maskedAmount(code) : formatAmount(amount, code, showCents, language)}`;
}

// Two currencies get two figures, never one sum: there is no rate here.
export function DayTotal({ totals, showCents = true, sizeClass = "text-footnote" }: DayTotalProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    return (
        <View className="flex-row items-baseline gap-1.5">
            {totals.map((bucket, index) => {
                const amount = signedAmount(bucket.amount, bucket.currencyCode, showCents, language, hidden);
                return (
                    <Fragment key={bucket.currencyCode}>
                        {index > 0 ? <Text className={cn(ROW_TYPE.subtotal, "text-subtle", sizeClass)}>/</Text> : null}
                        <Text
                            accessibilityLabel={hidden ? t("log.amounts.hidden") : amount}
                            className={cn(ROW_TYPE.subtotal, "text-muted tabular-nums", sizeClass)}
                            numberOfLines={1}
                        >
                            {amount}
                        </Text>
                    </Fragment>
                );
            })}
        </View>
    );
}
