import Camera01Icon from "@hugeicons-pro/core-stroke-rounded/Camera01Icon";
import Image01Icon from "@hugeicons-pro/core-stroke-rounded/Image01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { addDays, startOfDay } from "@outlayr/money/calendar";
import type { RateTable } from "@outlayr/money/valuation";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Shimmer } from "panelui-native/components/shimmer";
import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { Linking, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiConsentGate } from "@/components/ai-consent";
import { LimitToast } from "@/components/limit-toast";
import { ModalClose } from "@/components/modal-close";
import { PhotoStage } from "@/components/receipt/photo-stage";
import type { StageBox } from "@/components/receipt/photo-stage";
import { ReceiptFrame } from "@/components/receipt/receipt-frame";
import { ThinkingOrb } from "@/components/thinking-orb/thinking-orb";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { getAccountById, rememberLastUsedAccount } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { suggestedCardFee } from "@/data/card-fees-core";
import { useCategoriesByNamespace } from "@/data/categories";
import { getCategoryById } from "@/data/categories-core";
import { useAiConsent } from "@/data/settings";
import { transactionsRepo } from "@/data/transactions-core";
import { useValuationIn } from "@/data/use-valuation";
import type { AuthGate } from "@/domain/auth-gate";
import { formatChargeDate } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { boundedPromptNames } from "@/domain/prompt-budget";
import { conversionOf, formatQuantity, receiptDetails, resolveReceipt, savableReceipt } from "@/domain/receipt-scan";
import type { Conversion, ResolvedReceipt } from "@/domain/receipt-scan";
import { formatRateFigure, pairQuotedInverse, pairUnitSymbols, quotePairRate } from "@/domain/transaction-entry-rate";
import type { CategoryCandidate } from "@/domain/voice-entry";
import { stillCurrent } from "@/domain/voice-entry";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useReceiptScan } from "@/hooks/use-receipt-scan";
import type { ScanFailure, ScanPhoto } from "@/hooks/use-receipt-scan";
import { useRegionCode } from "@/hooks/use-region-code";
import { isLimitRefusal, useLimitNotice } from "@/hooks/use-usage-limits";
import type { TranslatableKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { useAuthSession } from "@/lib/auth-session";
import { freshEntries } from "@/lib/fresh-entries";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

const STAGE_GUTTER = 24;
const STAGE_MAX_HEIGHT_RATIO = 0.5;
const STAGE_MAX_HEIGHT = 480;
const THUMB_HEIGHT = 96;
const THUMB_MIN_WIDTH = 56;
const THUMB_MAX_WIDTH = 120;
const FRAME_WIDTH = 220;
const FRAME_HEIGHT = 268;
const MARK_SIZE = 24;
const MARK_RADIUS = 7;
const LINE_STAGGER_MS = 34;
const LINE_STAGGER_MAX_MS = 560;
const STATUS_SWEEP_MS = 1800;

export const FAILURE_KEY = {
    denied: "receipt.failed.denied",
    noCamera: "receipt.failed.noCamera",
    notConfigured: "receipt.failed.notConfigured",
    notEntitled: "receipt.failed.notEntitled",
    offline: "receipt.failed.offline",
    provider: "receipt.failed.provider",
    quotaExceeded: "receipt.failed.quotaExceeded",
    rateLimited: "receipt.failed.rateLimited",
    timeout: "receipt.failed.timeout",
    unauthenticated: "receipt.failed.unauthenticated",
    unclear: "receipt.failed.unclear",
    unreadable: "receipt.failed.unreadable",
} as const satisfies Record<ScanFailure, string>;

/** A failure the same photo may survive: nothing was wrong with the picture. */
export const RETRYABLE: ReadonlySet<ScanFailure> = new Set(["offline", "provider", "rateLimited", "timeout"]);

function dayLabel(date: Date, now: Date, t: TranslateFn, language: Language): string {
    const target = startOfDay(date).getTime();
    const today = startOfDay(now);
    if (target === today.getTime()) {
        return t("common.today");
    }
    if (target === addDays(today, -1).getTime()) {
        return t("common.yesterday");
    }
    return formatChargeDate(date, now, language);
}

function fitPhoto(photo: ScanPhoto, maxWidth: number, maxHeight: number): StageBox {
    const aspect = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 0.7;
    const scale = Math.min(maxWidth / aspect, maxHeight);
    return { height: Math.round(scale), width: Math.round(scale * aspect) };
}

export function useStageBox(): (photo: ScanPhoto) => StageBox {
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    return (photo) =>
        fitPhoto(
            photo,
            windowWidth - STAGE_GUTTER * 2,
            Math.min(STAGE_MAX_HEIGHT, (windowHeight - insets.top - insets.bottom) * STAGE_MAX_HEIGHT_RATIO)
        );
}

function thumbBox(photo: ScanPhoto): StageBox {
    const aspect = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 0.7;
    const width = Math.min(THUMB_MAX_WIDTH, Math.max(THUMB_MIN_WIDTH, Math.round(THUMB_HEIGHT * aspect)));
    return { height: THUMB_HEIGHT, width };
}

export function ScanShell({
    bottom,
    children,
    closeDisabled = false,
    onClose,
    overlay,
    scroll = false,
}: {
    bottom: React.ReactNode;
    children: React.ReactNode;
    closeDisabled?: boolean;
    onClose: () => void;
    overlay?: React.ReactNode;
    scroll?: boolean;
}) {
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    return (
        <View className="bg-background flex-1">
            <ModalClose accessibilityLabel={t("receipt.close")} disabled={closeDisabled} onPress={onClose} />
            {scroll ? (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-5 pb-6 pt-2"
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            ) : (
                <View className="flex-1 items-center justify-center gap-6 px-6">{children}</View>
            )}
            <View
                className={scroll ? "border-separator gap-2 border-t px-5 pt-3" : "gap-2 px-5"}
                style={{ paddingBottom: Math.max(insets.bottom, 20) }}
            >
                {bottom}
            </View>
            {overlay}
        </View>
    );
}

export function StatusLine({
    children,
    thinking = false,
    waiting = false,
}: {
    children: string;
    thinking?: boolean;
    waiting?: boolean;
}) {
    const colors = useColors();
    return (
        <Animated.View
            className="flex-row items-center justify-center gap-2"
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            key={children}
        >
            {thinking ? <ThinkingOrb state="searching" /> : null}
            {waiting ? (
                <Shimmer
                    as="text"
                    baseColor={colors.muted}
                    duration={STATUS_SWEEP_MS}
                    shimmerColor={colors.foreground}
                    textClassName="font-sans-medium text-center text-lg"
                >
                    {children}
                </Shimmer>
            ) : (
                <Text className="font-sans-medium text-muted text-center text-lg">{children}</Text>
            )}
        </Animated.View>
    );
}

export interface BarAction {
    icon?: typeof Camera01Icon;
    label: string;
    onPress: () => void;
}

export function BottomBar({
    disabled = false,
    primary,
    secondary,
    tertiary,
}: {
    disabled?: boolean;
    primary: BarAction | null;
    secondary: BarAction | null;
    tertiary?: BarAction | null;
}) {
    const colors = useColors();
    return (
        <Animated.View className="gap-1" entering={FadeIn.duration(220)}>
            <View className="flex-row items-center gap-2.5">
                {secondary ? (
                    <View className="flex-1">
                        <Button
                            className="rounded-full"
                            disabled={disabled}
                            fullWidth
                            onPress={secondary.onPress}
                            size="md"
                            startContent={
                                secondary.icon ? (
                                    <HugeiconsIcon
                                        color={colors.foreground}
                                        icon={secondary.icon}
                                        size={18}
                                        strokeWidth={1.9}
                                    />
                                ) : undefined
                            }
                            variant="secondary"
                        >
                            {secondary.label}
                        </Button>
                    </View>
                ) : null}
                {primary ? (
                    <View className="flex-1">
                        <Button
                            className="rounded-full"
                            disabled={disabled}
                            fullWidth
                            onPress={primary.onPress}
                            size="md"
                            startContent={
                                primary.icon ? (
                                    <HugeiconsIcon
                                        color={colors.accentForeground}
                                        icon={primary.icon}
                                        size={18}
                                        strokeWidth={1.9}
                                    />
                                ) : undefined
                            }
                            variant="primary"
                        >
                            {primary.label}
                        </Button>
                    </View>
                ) : null}
            </View>
            {tertiary ? (
                <Button
                    className="rounded-full"
                    disabled={disabled}
                    onPress={tertiary.onPress}
                    size="md"
                    variant="ghost"
                >
                    {tertiary.label}
                </Button>
            ) : null}
        </Animated.View>
    );
}

function LineRow({
    currency,
    index,
    language,
    line,
    last,
}: {
    currency: string;
    index: number;
    language: Language;
    line: ResolvedReceipt["items"][number];
    last: boolean;
}) {
    const delay = Math.min(LINE_STAGGER_MAX_MS, 80 + index * LINE_STAGGER_MS);
    return (
        <Animated.View
            className={`flex-row items-baseline gap-3 py-2.5 ${last ? "" : "border-separator border-b"}`}
            entering={FadeInDown.delay(delay).duration(240)}
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
    value,
}: {
    delay: number;
    emphasis?: boolean;
    label: string;
    value: string;
}) {
    return (
        <Animated.View
            className="flex-row items-baseline gap-3 py-1.5"
            entering={FadeInDown.delay(delay).duration(240)}
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

function ConversionLine({
    conversion,
    language,
    ledgerCurrency,
    receipt,
}: {
    conversion: Conversion | null;
    language: Language;
    ledgerCurrency: string;
    receipt: ResolvedReceipt;
}) {
    const t = useTranslation();
    if (receipt.currency === ledgerCurrency) {
        return null;
    }
    if (conversion === null) {
        return (
            <Text className="text-subtle text-footnote font-sans">
                {t("receipt.review.noRate", { currency: receipt.currency })}
            </Text>
        );
    }
    const inverse = pairQuotedInverse(receipt.currency, ledgerCurrency, conversion.rate);
    return (
        <View className="gap-0.5">
            <Text className="font-sans-medium text-muted text-title tabular-nums">
                ≈ {formatAmount(conversion.amount, ledgerCurrency, true, language)}
            </Text>
            <Text className="text-subtle text-footnote font-sans tabular-nums">
                {t("receipt.review.rate", {
                    ...pairUnitSymbols(receipt.currency, ledgerCurrency, inverse),
                    rate: formatRateFigure(quotePairRate(inverse, conversion.rate), language),
                })}
                {receipt.currencySource === "inferred" ? (
                    <>
                        <Text> · </Text>
                        {t("receipt.review.inferredCurrency")}
                    </>
                ) : null}
            </Text>
        </View>
    );
}

function ReviewSheet({
    categoryName,
    ledgerCurrency,
    photo,
    rates,
    receipt,
    tint,
}: {
    categoryName: string | null;
    ledgerCurrency: string;
    photo: ScanPhoto;
    rates: RateTable;
    receipt: ResolvedReceipt;
    tint: string;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const mark = useMerchantMark(receipt.merchant.trim().length > 0 ? receipt.merchant : null, receipt.domain);
    const conversion = conversionOf(receipt, ledgerCurrency, rates);
    const day = dayLabel(receipt.date, new Date(), t, language);
    const preposition = t(receipt.income ? "receipt.review.from" : "receipt.review.at");
    const amountClass = receipt.income ? "text-income" : "text-foreground";
    const money = (value: number) => formatAmount(value, receipt.currency, true, language);
    const summary: { emphasis?: boolean; key: string; label: string; value: number }[] = [];
    if (receipt.subtotal !== null) {
        summary.push({ key: "subtotal", label: t("receipt.review.subtotal"), value: receipt.subtotal });
    }
    if (receipt.tax !== null) {
        summary.push({ key: "tax", label: t("receipt.review.tax"), value: receipt.tax });
    }
    if (receipt.tip !== null) {
        summary.push({ key: "tip", label: t("receipt.review.tip"), value: receipt.tip });
    }
    summary.push({ emphasis: true, key: "total", label: t("receipt.review.total"), value: receipt.amount });
    const summaryDelay = Math.min(LINE_STAGGER_MAX_MS, 80 + receipt.items.length * LINE_STAGGER_MS) + 40;

    return (
        <View className="gap-6">
            <View className="flex-row items-start gap-4">
                <PhotoStage box={thumbBox(photo)} scanning={false} tint={tint} uri={photo.uri} />
                <Animated.View className="flex-1 gap-1 pt-1" entering={FadeIn.delay(120).duration(260)}>
                    <View className="flex-row items-center gap-2">
                        <Text className="font-sans-medium text-grammar text-title">{preposition}</Text>
                        {mark ? (
                            <Animated.View entering={FadeIn.duration(200)}>
                                <Image
                                    contentFit="cover"
                                    source={{ uri: mark }}
                                    style={{ borderRadius: MARK_RADIUS, height: MARK_SIZE, width: MARK_SIZE }}
                                />
                            </Animated.View>
                        ) : null}
                        <Text className="font-sans-medium text-foreground text-title shrink" numberOfLines={2}>
                            {receipt.merchant.trim().length > 0 ? receipt.merchant : t("receipt.review.noMerchant")}
                        </Text>
                    </View>
                    <Text className="text-muted font-sans text-base" numberOfLines={1}>
                        {categoryName ?? t("receipt.review.noCategory")}
                        <Text className="text-subtle"> · </Text>
                        {day}
                    </Text>
                    {receipt.paymentMethod ? (
                        <Text className="text-subtle text-footnote font-sans" numberOfLines={1}>
                            {t("receipt.review.paid", { method: receipt.paymentMethod })}
                        </Text>
                    ) : null}
                </Animated.View>
            </View>

            <Animated.View className="gap-1" entering={FadeIn.delay(180).duration(280)}>
                <Text className={`font-sans-semibold text-hero tabular-nums ${amountClass}`}>
                    {money(receipt.amount)}
                </Text>
                <ConversionLine
                    conversion={conversion}
                    language={language}
                    ledgerCurrency={ledgerCurrency}
                    receipt={receipt}
                />
            </Animated.View>

            {receipt.items.length > 0 ? (
                <View>
                    <Animated.View
                        className="border-separator flex-row items-baseline border-b pb-2"
                        entering={FadeIn.delay(60).duration(200)}
                    >
                        <Text className="text-muted text-footnote flex-1 font-sans">
                            {t("receipt.review.lines", { count: receipt.items.length })}
                        </Text>
                        <Text className="text-subtle text-footnote font-sans">{receipt.currency}</Text>
                    </Animated.View>
                    {receipt.items.map((line, index) => (
                        <LineRow
                            currency={receipt.currency}
                            index={index}
                            key={`${index}-${line.name}`}
                            language={language}
                            last={index === receipt.items.length - 1}
                            line={line}
                        />
                    ))}
                </View>
            ) : null}

            <View className="border-separator border-t pt-2">
                {summary.map((row, index) => (
                    <SummaryRow
                        delay={summaryDelay + index * LINE_STAGGER_MS}
                        emphasis={row.emphasis}
                        key={row.key}
                        label={row.label}
                        value={money(row.value)}
                    />
                ))}
            </View>
        </View>
    );
}

export function ScanGateScreen({
    failures = FAILURE_KEY,
    gate,
}: {
    failures?: Readonly<Record<ScanFailure, TranslatableKey>>;
    gate: Exclude<AuthGate, "signed-in">;
}) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    let status = t("receipt.state.preparing");
    if (gate === "unconfigured") {
        status = t(failures.notConfigured);
    } else if (gate === "signed-out") {
        status = t(failures.unauthenticated);
    }
    return (
        <ScanShell bottom={null} onClose={() => router.back()}>
            <ReceiptFrame
                height={FRAME_HEIGHT}
                ink={colors.foreground}
                paper={colors.surface}
                tint={colors.muted}
                width={FRAME_WIDTH}
            />
            <StatusLine waiting={gate === "restoring"}>{status}</StatusLine>
        </ScanShell>
    );
}

function pairRates(paid: RateTable, ledger: RateTable, paidCode: string): RateTable {
    return {
        earliest: (code) => (code === paidCode ? paid.earliest(code) : ledger.earliest(code)),
        get: (code, dateKey) => (code === paidCode ? paid.get(code, dateKey) : ledger.get(code, dateKey)),
    };
}

type CreateArgs = Parameters<typeof transactionsRepo.create>;

function receiptEntry(
    db: CreateArgs[0],
    draft: ResolvedReceipt,
    categoryId: string,
    details: CreateArgs[1]["details"]
): CreateArgs[1] {
    return {
        accountId: draft.accountId,
        amount: draft.amount,
        categoryId,
        currency: draft.currency,
        date: draft.date,
        details,
        fee: draft.income
            ? null
            : suggestedCardFee(db, {
                  account: draft.accountId ? getAccountById(db, draft.accountId) : null,
                  categoryId,
                  currency: draft.currency,
                  merchant: draft.merchant,
              }),
        income: draft.income,
        note: draft.merchant,
    };
}

function ScanFlowScreen() {
    const router = useRouter();
    const entitled = useProEntitled();
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const haptics = useHaptics();
    const { language } = useLanguage();
    const localeTag = useLocaleTag();
    const regionCode = useRegionCode();
    const currency = useGlobalCurrency(db);
    const accounts = useBankAccounts(db);
    const expenseCategories = useCategoriesByNamespace(db, false);
    const incomeCategories = useCategoriesByNamespace(db, true);
    const [saving, setSaving] = useState(false);
    const isMounted = useIsMounted();

    const categoryTree = useMemo(
        () =>
            [...expenseCategories, ...incomeCategories]
                .filter((parent) => parent.name != null)
                .map((parent) => ({
                    children: parent.children.map((child) => child.name).filter((name) => name != null),
                    // SAFETY: filtered to a non-null name just above.
                    name: parent.name as string,
                })),
        [expenseCategories, incomeCategories]
    );
    const candidates = useMemo<CategoryCandidate[]>(
        () =>
            [...expenseCategories, ...incomeCategories].flatMap((parent) => [
                { id: parent.id, income: parent.income, name: parent.name },
                ...parent.children.map((child) => ({ id: child.id, income: child.income, name: child.name })),
            ]),
        [expenseCategories, incomeCategories]
    );
    const bounded = useMemo(
        () => boundedPromptNames({ accounts: accounts.map((account) => account.name), categoryTree }),
        [accounts, categoryTree]
    );
    const request = useMemo(
        () => ({
            accounts: bounded.accounts,
            categoryTree: bounded.categoryTree,
            currency,
            language: localeTag,
            regionCode,
        }),
        [bounded, currency, localeTag, regionCode]
    );

    // The ledger the model saw, not the one sync may have left by the time it answers.
    const context = useMemo(
        () => ({
            accounts: accounts.map((account) => ({
                currency: account.currency,
                id: account.id,
                name: account.name,
            })),
            accountsOmitted: bounded.accountsOmitted,
            categories: candidates,
            categoriesOmitted: bounded.categoriesOmitted,
            currency,
        }),
        [accounts, bounded.accountsOmitted, bounded.categoriesOmitted, candidates, currency]
    );

    const { phase, takePhoto, chooseFromLibrary, retry, reset } = useReceiptScan({ context, request });
    const limit = useLimitNotice(
        "receiptScan",
        phase.kind === "failed" && isLimitRefusal(phase.reason) ? phase.reason : null
    );
    const limitToast = <LimitToast feature="receiptScan" {...limit} />;

    const receipt = useMemo(
        () =>
            phase.kind === "review" ? resolveReceipt({ ...phase.context, draft: phase.draft, now: new Date() }) : null,
        [phase]
    );
    const paidCurrency = receipt?.currency ?? currency;
    const paidValuation = useValuationIn(db, paidCurrency);
    const ledgerValuation = useValuationIn(db, currency);
    const rates = useMemo(
        () => pairRates(paidValuation.rates, ledgerValuation.rates, paidCurrency),
        [ledgerValuation.rates, paidCurrency, paidValuation.rates]
    );
    const live = useMemo(
        () => ({
            accountIds: new Set(accounts.map((account) => account.id)),
            categoryIds: new Set(candidates.map((candidate) => candidate.id)),
        }),
        [accounts, candidates]
    );
    const savableCategoryId =
        receipt && stillCurrent(receipt, live) ? (savableReceipt(receipt)?.categoryId ?? null) : null;
    const categoryName = receipt?.categoryId ? (getCategoryById(db, receipt.categoryId)?.name ?? null) : null;

    const detailsOf = useCallback(
        (draft: ResolvedReceipt) =>
            receiptDetails(
                draft,
                (amount) => formatAmount(amount, draft.currency, true, language),
                (count) => t("receipt.details.more", { count })
            ),
        [language, t]
    );

    const close = useCallback(() => {
        router.back();
    }, [router]);

    const openForm = useCallback(
        (draft: ResolvedReceipt) => {
            // An account sync removed is a question for the form, not a seed to swap for the last used.
            const accountLive = draft.accountId === null || live.accountIds.has(draft.accountId);
            const params = {
                accountId: accountLive ? (draft.accountId ?? undefined) : undefined,
                accountUnresolved: draft.accountUnresolved || !accountLive ? "1" : undefined,
                amount: String(draft.amount),
                categoryId: draft.categoryId ?? undefined,
                currency: draft.currency,
                date: String(draft.date.getTime()),
                details: detailsOf(draft) ?? undefined,
                income: draft.income ? "1" : "0",
                note: draft.merchant,
            };
            router.replace({ params, pathname: "/transactions/create" });
        },
        [detailsOf, live, router]
    );

    const save = useCallback(
        (draft: ResolvedReceipt, categoryId: string) => {
            setSaving(true);
            const write = async () => {
                try {
                    const id = await transactionsRepo.create(db, receiptEntry(db, draft, categoryId, detailsOf(draft)));
                    freshEntries.mark(id);
                } catch {
                    // The row did not land; the form has the failure strip this screen lacks.
                    setSaving(false);
                    if (isMounted()) {
                        openForm(draft);
                    }
                    return;
                }
                if (draft.accountId) {
                    await rememberLastUsedAccount(db, draft.accountId).catch(() => null);
                }
                posthog?.capture("transaction_saved", {
                    has_split: false,
                    is_subscription: false,
                    mode: "create",
                    source: "scan",
                    transaction_type: draft.income ? "income" : "expense",
                });
                haptics("success");
                // A modal gesture can dismiss this mid-write; popping again would take the screen beneath.
                if (isMounted()) {
                    router.back();
                }
            };
            void write();
        },
        [db, detailsOf, haptics, isMounted, openForm, router]
    );

    const openSettings = useCallback(() => {
        Linking.openSettings().catch(() => undefined);
    }, []);

    const stageBox = useStageBox();

    const cameraAction: BarAction = { icon: Camera01Icon, label: t("receipt.action.camera"), onPress: takePhoto };
    const libraryAction: BarAction = {
        icon: Image01Icon,
        label: t("receipt.action.library"),
        onPress: chooseFromLibrary,
    };

    if (phase.kind === "review" && receipt) {
        return (
            <ScanShell
                bottom={
                    <BottomBar
                        disabled={saving}
                        primary={
                            savableCategoryId === null
                                ? { label: t("receipt.action.finish"), onPress: () => openForm(receipt) }
                                : { label: t("receipt.action.save"), onPress: () => save(receipt, savableCategoryId) }
                        }
                        secondary={{ label: t("receipt.action.edit"), onPress: () => openForm(receipt) }}
                        tertiary={{ label: t("receipt.action.another"), onPress: reset }}
                    />
                }
                closeDisabled={saving}
                onClose={close}
                overlay={limitToast}
                scroll
            >
                <ReviewSheet
                    categoryName={categoryName}
                    ledgerCurrency={currency}
                    photo={phase.photo}
                    rates={rates}
                    receipt={receipt}
                    tint={colors.tint}
                />
            </ScanShell>
        );
    }

    if (phase.kind === "scanning") {
        return (
            <ScanShell
                bottom={
                    <Button className="rounded-full" onPress={reset} size="md" variant="ghost">
                        {t("common.cancel")}
                    </Button>
                }
                onClose={close}
                overlay={limitToast}
            >
                <PhotoStage box={stageBox(phase.photo)} scanning tint={colors.tint} uri={phase.photo.uri} />
                <StatusLine thinking waiting>
                    {t("receipt.state.reading")}
                </StatusLine>
            </ScanShell>
        );
    }

    if (phase.kind === "failed") {
        let primary: BarAction | null = libraryAction;
        let secondary: BarAction | null = null;
        if (phase.reason === "notEntitled" && !entitled) {
            primary = { label: t("pro.action.see"), onPress: () => router.push("/paywall") };
        } else if (phase.reason === "notEntitled") {
            primary = phase.photo === null ? cameraAction : { label: t("receipt.action.retry"), onPress: retry };
            secondary = libraryAction;
        } else if (phase.reason === "quotaExceeded") {
            primary = null;
        } else if (phase.reason === "denied") {
            primary = { label: t("receipt.action.settings"), onPress: openSettings };
            secondary = libraryAction;
        } else if (phase.reason === "noCamera") {
            primary = libraryAction;
        } else if (phase.photo !== null && RETRYABLE.has(phase.reason)) {
            primary = { label: t("receipt.action.retry"), onPress: retry };
            secondary = libraryAction;
        } else {
            primary = cameraAction;
            secondary = libraryAction;
        }
        return (
            <ScanShell
                bottom={<BottomBar primary={primary} secondary={secondary} />}
                onClose={close}
                overlay={limitToast}
            >
                {phase.photo ? (
                    <PhotoStage
                        box={stageBox(phase.photo)}
                        dimmed
                        scanning={false}
                        tint={colors.tint}
                        uri={phase.photo.uri}
                    />
                ) : (
                    <ReceiptFrame
                        height={FRAME_HEIGHT}
                        ink={colors.foreground}
                        paper={colors.surface}
                        tint={colors.danger}
                        width={FRAME_WIDTH}
                    />
                )}
                {isLimitRefusal(phase.reason) ? null : <StatusLine>{t(FAILURE_KEY[phase.reason])}</StatusLine>}
            </ScanShell>
        );
    }

    const picking = phase.kind === "picking";
    return (
        <ScanShell
            bottom={<BottomBar disabled={picking} primary={cameraAction} secondary={libraryAction} />}
            onClose={close}
            overlay={limitToast}
        >
            <ReceiptFrame
                height={FRAME_HEIGHT}
                ink={colors.foreground}
                paper={colors.surface}
                tint={colors.tint}
                width={FRAME_WIDTH}
            />
            <Animated.View className="items-center gap-2 px-4" entering={FadeIn.duration(260)}>
                <Text className="font-sans-semibold text-foreground text-title text-center">{t("receipt.title")}</Text>
                <Text className="text-muted text-center font-sans text-base">{t("receipt.intro")}</Text>
            </Animated.View>
        </ScanShell>
    );
}

/** Signed-in only: the action authenticates on the Convex client mounted then. Consent precedes the camera. */
export function ReceiptScanScreen() {
    const { gate } = useAuthSession();
    const consent = useAiConsent(useDatabase());
    if (gate === "signed-in") {
        return consent === "allowed" ? <ScanFlowScreen /> : <AiConsentGate />;
    }
    return <ScanGateScreen gate={gate} />;
}
