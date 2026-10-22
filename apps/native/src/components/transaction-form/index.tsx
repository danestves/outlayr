import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { toAccountKind } from "@outlayr/money/account-kind";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { ensureRecurringType, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { useField, useForm, useSelector } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { PortalHost, PortalProvider } from "panelui-native/primitives/portal";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Pressable,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { shallowEqual } from "@/components/form/shallow-equal";
import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { SubscribeFields } from "@/components/form/subscribe-fields";
import { useAppSettings, useDisplaySettings, useSettingBool } from "@/contexts/display-settings-context";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp } from "@/contexts/identity-draft-context";
import { useBankAccounts, usePeople } from "@/data/accounts";
import { getAccountById, getLastUsedAccount, rememberLastUsedAccount } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import {
    cardFeeFor,
    feeRatesOn,
    lastFeeCategoryId,
    lastForeignFeeRate,
    recentPaidVia,
    rememberFeeCategory,
} from "@/data/card-fees-core";
import type { CardFeeInput } from "@/data/card-fees-core";
import { useCategoriesByNamespace } from "@/data/categories";
import { ensureCategoryByName, getCategoryById } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";
import { queueEnrichment } from "@/data/enrichment-queue-core";
import { useFavouriteCurrencies } from "@/data/favourite-currencies";
import { useRatesRead } from "@/data/live-query";
import { recallMerchant } from "@/data/merchant-book-core";
import { useRecentMerchants } from "@/data/merchant-history";
import { rememberedCategoryFor } from "@/data/merchant-history-core";
import { applyMerchantToSiblings } from "@/data/merchant-siblings-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import { remoteEnrichmentOn, setBoolSetting } from "@/data/settings-core";
import { splitsRepo } from "@/data/splits-core";
import { useTagIdsFor, useTags } from "@/data/tags";
import { tagIdsForQuery, tagsRepo } from "@/data/tags-core";
import { transactionRateSuggestions } from "@/data/transaction-entry-rates";
import { getTransactionById, transactionsRepo } from "@/data/transactions-core";
import type { Transaction, TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { rowAmountLabel } from "@/domain/amount-label";
import { cardFeeAmount, cardFeeBase, cardFeeOf, feeDraftOf, formatFeeRate, NO_FEE } from "@/domain/card-fee";
import type { FeeDraft } from "@/domain/card-fee";
import { computeCurtainHues } from "@/domain/curtain-hues";
import { formatSentenceDate } from "@/domain/dates";
import type { InstallmentSeed } from "@/domain/installment-scan";
import { merchantKey } from "@/domain/merchant-resolver";
import { suggestMerchants } from "@/domain/merchant-suggest";
import { formatAmount, minorUnitsFor, numberLocale, roundToMinorUnits, symbolIsShared } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { isPaidVia, PAID_VIA, paidViaCharge, paidViaFee, rememberedPaidVia } from "@/domain/paid-via";
import type { PaidVia } from "@/domain/paid-via";
import { rateAge } from "@/domain/rate-age";
import type { RateAge } from "@/domain/rate-age";
import { enableReminderStep } from "@/domain/reminder";
import { isBalanced } from "@/domain/split";
import type { Allocation } from "@/domain/split";
import { isRealSplit } from "@/domain/split-draft";
import { normalizeLead } from "@/domain/subscription-reminder";
import { findTagByName, normalizeTagName } from "@/domain/tags";
import type { LogAgainDraft } from "@/domain/transaction-actions";
import {
    effectiveEntryRate,
    flipRateForQuote,
    formatQuotedRate,
    formatQuotedRateFigure,
    pairUnitSymbols,
    RATE_ENTRY_DECIMALS,
    rateDeltaPercent,
    transactionRateError,
    transactionRateOptions,
} from "@/domain/transaction-entry-rate";
import type { TransactionEntryRate } from "@/domain/transaction-entry-rate";
import {
    ctaKey,
    namedWithCount,
    quotedByBcv,
    rateDeltaLine,
    rateNameKey,
    rateSourceWordKey,
    transactionWhenLabel,
} from "@/domain/transaction-form-labels";
import { buildTransactionInput } from "@/domain/transaction-form-save";
import { transactionFormErrors } from "@/domain/transaction-form-validate";
import { resolveTransactionIdentity } from "@/domain/transaction-identity";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useAccountCreateRoute } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import type { SheetRest } from "@/hooks/use-resting-sheet";
import { useToggleFavouriteCurrency } from "@/hooks/use-toggle-favourite-currency";
import { useTransactionEnrichment } from "@/hooks/use-transaction-enrichment";
import type { EnrichmentSuggestion, PendingCategory } from "@/hooks/use-transaction-enrichment";
import { useLanguage, useTranslation } from "@/i18n/context";
import { celebration } from "@/lib/celebration";
import { sendEnrichmentQueue } from "@/lib/enrichment-queue";
import { freshEntries } from "@/lib/fresh-entries";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { notifyFailure, notifySaved } from "@/lib/notify";
import { posthog } from "@/lib/posthog";
import { openNotificationSettings, reminderPermission, requestReminderPermission } from "@/lib/reminders";
import { askForReview } from "@/lib/review-prompt";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";
import { useHaptics } from "@/lib/use-haptics";
import { glowFromEmoji, glowFromImage } from "@/theme/glow";
import { useColors } from "@/theme/use-colors";

import { AccountTile } from "../account-tile";
import { AmountNumpad } from "../amount-numpad";
import { CategoryIcon } from "../category-icon";
import { CategoryIconTile } from "../category-icon-tile";
import { CustomScheduleSheet, intervalPhrase } from "../custom-schedule-sheet";
import { IdentityFlyUpLayer } from "../identity-fly-up";
import { revealEntering } from "../sentence/sentence-motion";
import { SplitSheet } from "../split-sheet";
import { TagPickerSheet } from "../tag-picker-sheet";
import { Text } from "../text";
import { ThinkingOrb } from "../thinking-orb/thinking-orb";
import { TransactionFormAmountPad } from "./amount-pad";
import { TransactionFormCta } from "./cta";
import { FormScroll, FormScrollItem, FormScrollStageTarget } from "./form-scroll";
import { FeeTotal } from "./sentence/fee-total";
import { TransactionSentenceBody } from "./sentence/sentence-body";
import type { TransactionSentenceMark } from "./sentence/slots";
import type { TransactionRateClause } from "./sentence/transaction-sentence";
import { MetaLine } from "./stage/meta-line";
import { StagePartContext, TransactionStage } from "./stage/stage";
import type { StageAction, StageFooter } from "./stage/stage";
import { StageOptionRow } from "./stage/stage-options";
import type { StageOptionItem } from "./stage/stage-options";
import { StepAccount } from "./stage/step-account";
import { StepAccountInstallments } from "./stage/step-account-installments";
import { StepCategory } from "./stage/step-category";
import { StepCurrency } from "./stage/step-currency";
import { StepDate } from "./stage/step-date";
import { StepFee } from "./stage/step-fee";
import type { StepFeeField } from "./stage/step-fee";
import { StepMerchant } from "./stage/step-merchant";
import { StepRate, StepRateField } from "./stage/step-rate";
import type { StepRateOption } from "./stage/step-rate";
import { StepRepeat } from "./stage/step-repeat";
import { StepWhen } from "./stage/step-when";
import { useInstallmentOrder } from "./use-installment-order";
import { useSplitDraft } from "./use-split-draft";

const HERO_REST_TOP = 88;

// A stage body has no intrinsic height and an auto-sized list measures zero while the stage swaps, so the list needs
// a size from the first frame. A window fraction, since the sentence still sits above.
const CURRENCY_LIST_FRACTION = 0.34;

const MERCHANT_SUGGESTION_LIMIT = 4;

type StageStep =
    | "account"
    | "amount"
    | "category"
    | "currency"
    | "date"
    | "endDate"
    | "fee"
    | "feeCategory"
    | "merchant"
    | "paidVia"
    | "rate"
    | "rateCustom"
    | "rateUsd"
    | "repeat"
    | "when";

// One value: a step and its direction must change in the same commit, or a return slides in as a forward move.
interface StagePosition {
    forward: boolean;
    step: StageStep;
}

const GUIDED_STEPS = ["amount", "merchant", "category", "account"] as const;

type GuidedStep = (typeof GUIDED_STEPS)[number];

// The merchant drives enrichment, not validity, so pressing the footer on its step is the skip.
const OPTIONAL_STEPS: ReadonlySet<GuidedStep> = new Set(["merchant"]);

const GUIDED_POSITIONS = new Map<StageStep, number>(GUIDED_STEPS.map((step, index) => [step, index]));

function backStepOf(step: StageStep): StageStep {
    if (step === "feeCategory") {
        return "fee";
    }
    return step === "rateCustom" ? "rate" : "amount";
}

function guidedIndex(step: StageStep): number {
    return GUIDED_POSITIONS.get(step) ?? -1;
}

const STEP_SLOTS = {
    account: "account",
    amount: "amount",
    category: "category",
    currency: "amount",
    date: "when",
    endDate: "when",
    fee: "fee",
    feeCategory: "fee",
    merchant: "merchant",
    paidVia: "paidVia",
    rate: "rateSource",
    rateCustom: "rateSource",
    rateUsd: "converted",
    repeat: "when",
    when: "when",
} as const satisfies Record<StageStep, TransactionSentenceMark>;

type FeeOptionId = "amount" | "none" | "paidVia" | "percent" | `rate:${number}`;

interface StageStepContent {
    body: ReactNode;
    footer?: StageFooter;
    rightAction?: StageAction;
    title: string;
}

interface RateEntry {
    seed: number | null;
    text: string;
}

const NO_RATE: RateEntry = { seed: null, text: "" };

interface RateSnapshot {
    entry: RateEntry;
    fromSuggestion: boolean;
    type: EntryRateType | null;
}

function seededRate(currency: string, rate: number | null | undefined): RateEntry {
    return rate != null && Number.isFinite(rate) && rate > 0
        ? { seed: rate, text: formatQuotedRate(currency, rate) }
        : NO_RATE;
}

function entryRateOf({ seed, text }: RateEntry, currency: string): number | null {
    if (seed !== null && text === formatQuotedRate(currency, seed)) {
        return seed;
    }
    return text === "" ? null : flipRateForQuote(currency, numpadToNumber(text));
}

function isProviderRate(rate: number | null | undefined, rateType: EntryRateType | null): boolean {
    return rate != null && rateType != null && rateType !== "custom";
}

// Only a human edit ("user") locks a field, so a later suggestion can still replace an earlier one.
type FieldSource = "initial" | "suggested" | "user";

// A quick action, widget or App Intent may set only amount, direction and note. The rest are for the voice screen,
// whose draft the user already read, with categories and accounts this ledger resolved by name.
export interface TransactionSeed {
    accountId?: string;
    /** Named but not placed: the form opens with no account rather than the last used one. */
    accountUnresolved?: boolean;
    amount?: number;
    categoryId?: string;
    currency?: string;
    date?: Date;
    details?: string;
    income?: boolean;
    installmentDraft?: InstallmentSeed;
    installments?: boolean;
    note?: string;
    recurrence?: { coefficient: number; type: number };
}

export interface TransactionFormDraft {
    accountDeclined: boolean;
    categorySource: FieldSource;
    identity: ReturnType<typeof useIdentityDraft>["draft"];
    identitySource: FieldSource;
    notes: string;
    splitAllocations: Allocation[];
    tagsSource: FieldSource;
    values: TransactionFormValues;
}

interface TransactionFormProps {
    /**
     * May carry category and identity, unlike `TransactionSeed`: it came off a row the user already confirmed.
     * No date or schedule, so the copy lands today as a one-off.
     */
    copyOf?: LogAgainDraft;
    db: Database;
    initial?: Transaction;
    mode: "create" | "edit";
    onDelete?: () => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDone: () => void;
    draftRef?: RefObject<(() => TransactionFormDraft) | null>;
    rest?: SheetRest;
    restore?: TransactionFormDraft;
    seed?: TransactionSeed;
}

function seedAccount(db: Database, initial: Transaction | undefined, seed: TransactionSeed | undefined) {
    if (initial) {
        return initial.accountId ? getAccountById(db, initial.accountId) : null;
    }
    if (seed?.accountUnresolved || (seed?.installments && !seed.accountId)) {
        return null;
    }
    return (seed?.accountId ? getAccountById(db, seed.accountId) : null) ?? getLastUsedAccount(db);
}

async function createPendingCategory(
    db: Database,
    pending: PendingCategory,
    income: boolean,
    siblings: readonly { id: string; name: string | null; parentId: string | null }[]
): Promise<string> {
    const parentId =
        pending.parentName == null
            ? null
            : (siblings.find((candidate) => candidate.parentId == null && candidate.name === pending.parentName)?.id ??
              null);
    return await ensureCategoryByName(db, pending.name, income, pending.icon, pending.color, {
        emoji: pending.emoji,
        parentId,
    });
}

async function materializeTagIds(
    db: Database,
    tagIds: readonly string[],
    pendingTagNames: readonly string[]
): Promise<string[]> {
    const materialized = [...tagIds];
    for (const tagName of pendingTagNames) {
        // oxlint-disable-next-line no-await-in-loop -- `ensureTag` matches before inserting with no unique constraint behind it, so two pending names that normalize to the same tag would each insert a row if these ran concurrently.
        const tagId = await tagsRepo.ensureTag(db, tagName);
        if (tagId != null && !materialized.includes(tagId)) {
            materialized.push(tagId);
        }
    }
    return materialized;
}

async function persistTransaction(
    db: Database,
    mode: "create" | "edit",
    initial: Transaction | undefined,
    input: TransactionInput,
    inSameTransaction: (id: string) => Promise<void>
): Promise<string> {
    if (mode === "edit" && initial) {
        await transactionsRepo.update(db, initial.id, input, { inSameTransaction });
        return initial.id;
    }
    return await transactionsRepo.create(db, input, { inSameTransaction });
}

function initialEntryRateType(currency: string, rateType: string | null | undefined): EntryRateType | null {
    if (currency === "USD") {
        return null;
    }
    const normalized = ENTRY_RATE_TYPES.find((candidate) => candidate === rateType);
    if (normalized === "eur_reference" && currency !== "VES") {
        return "official";
    }
    return normalized ?? "official";
}

// `official` stands in for an absent type: that is what an unanswered non-USD entry records.
function rateSelectionOf(
    rate: RateEntry,
    exchangeRateType: EntryRateType | null,
    currency: string
): TransactionEntryRate {
    return {
        exchangeRate: entryRateOf(rate, currency),
        exchangeRateType: exchangeRateType ?? "official",
    };
}

interface TransactionRateControlsOptions {
    currency: string;
    date: Date;
    exchangeRateType: EntryRateType | null;
    initialRateFromProvider: boolean;
    onStage: (step: StageStep, forward: boolean) => void;
    setCurrency: (currency: string) => void;
    setDate: (date: Date) => void;
    setRate: (rate: RateEntry | ((current: RateEntry) => RateEntry)) => void;
    setRateType: (rateType: EntryRateType | null) => void;
    stageStep: StageStep;
}

function useTransactionRateControls({
    currency,
    date,
    exchangeRateType,
    initialRateFromProvider,
    onStage,
    setCurrency,
    setDate,
    setRate,
    setRateType,
    stageStep,
}: TransactionRateControlsOptions) {
    const rateFromSuggestion = useRef(initialRateFromProvider);
    const leaveRateStep = () => {
        if (stageStep === "rate" || stageStep === "rateCustom" || stageStep === "rateUsd") {
            onStage("amount", false);
        }
    };

    const handleRateTypeChange = (next: EntryRateType) => {
        rateFromSuggestion.current = false;
        setRateType(next);
        setRate(NO_RATE);
        leaveRateStep();
    };

    const handleRateSuggestion = (rate: number, type: EntryRateType) => {
        rateFromSuggestion.current = true;
        setRateType(type);
        setRate(seededRate(currency, rate));
        leaveRateStep();
    };

    const handleCurrencyChange = (next: string) => {
        if (next !== currency) {
            rateFromSuggestion.current = false;
            setRate(NO_RATE);
        }
        setCurrency(next);
        if (next === "USD") {
            setRateType(null);
            setRate(NO_RATE);
            leaveRateStep();
            return;
        }
        if (exchangeRateType == null || (exchangeRateType === "eur_reference" && next !== "VES")) {
            setRateType("official");
            setRate(NO_RATE);
        }
    };

    const handleDateChange = (next: Date) => {
        if (next.getTime() !== date.getTime() && rateFromSuggestion.current) {
            rateFromSuggestion.current = false;
            setRate(NO_RATE);
        }
        setDate(next);
    };

    const handleRateTextChange = (next: string) => {
        rateFromSuggestion.current = false;
        if (exchangeRateType !== "custom") {
            setRateType("custom");
            setRate({ seed: null, text: next });
            return;
        }
        setRate((current) => ({ seed: current.seed, text: next }));
    };

    const openCustomRate = (prior: number | null) => {
        if (prior !== null) {
            rateFromSuggestion.current = true;
            setRateType("custom");
            setRate(seededRate(currency, prior));
        }
        onStage("rateCustom", true);
    };

    const applyDerivedRate = (rate: number) => {
        rateFromSuggestion.current = false;
        setRateType("custom");
        setRate(seededRate(currency, rate));
    };

    const snapshotRate = (entry: RateEntry): RateSnapshot => ({
        entry,
        fromSuggestion: rateFromSuggestion.current,
        type: exchangeRateType,
    });

    const restoreRate = (snapshot: RateSnapshot) => {
        rateFromSuggestion.current = snapshot.fromSuggestion;
        setRateType(snapshot.type);
        setRate(snapshot.entry);
    };

    return {
        applyDerivedRate,
        handleCurrencyChange,
        handleDateChange,
        handleRateSuggestion,
        handleRateTextChange,
        handleRateTypeChange,
        openCustomRate,
        restoreRate,
        snapshotRate,
    };
}

// oxlint-disable-next-line complexity -- known debt: this component owns entry, edit, copy and log-again in one tree. Splitting it is its own change, tracked separately from the lint gate.
export function TransactionForm({
    db,
    mode,
    initial,
    seed,
    copyOf,
    onDone,
    onDelete,
    onDirtyChange,
    draftRef,
    rest,
    restore,
}: TransactionFormProps) {
    const resting = rest !== undefined;
    const colors = useColors();
    const haptics = useHaptics();
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    // Swift's `.padding(.horizontal, 20)` content box.
    const contentWidth = windowWidth - 40;
    const currencyListHeight = Math.round(windowHeight * CURRENCY_LIST_FRACTION);
    const globalCurrency = useGlobalCurrency(db);

    const [nameSeed] = useState(initial?.note ?? copyOf?.note ?? seed?.note ?? "");
    const [notesSeed] = useState(restore?.notes ?? initial?.details ?? copyOf?.details ?? seed?.details ?? "");
    // The note lives in a ref: lifting it to state would re-render the SwiftUI `Host` per keystroke. The merchant name
    // has two editors, so it is a form field, read only through `Subscribe` for the same reason.
    const notesRef = useRef(notesSeed);

    const { draft: identity, setDraft: setIdentity } = useIdentityDraft();
    const [identitySource, setIdentitySource] = useState<FieldSource>(restore?.identitySource ?? "initial");
    const { pickerOpen, setPickerOpen } = useIdentityFlyUp();
    const [saveFailure, setSaveFailure] = useState<string | null>(null);

    // Frozen at mount: `useForm` re-applies changed `defaultValues` while untouched, and `date`/`endDate` are
    // `new Date()` here, so an inline object would re-seed both to now every render.
    const [initialValues] = useState(
        () => restore?.values ?? initialFormValues({ copyOf, db, globalCurrency, initial, nameSeed, seed })
    );

    const formErrorsOf = (value: typeof initialValues) =>
        transactionFormErrors({
            ...value,
            categoryDeferred: queueable(value.merchant),
            currency: value.txCurrency ?? globalCurrency,
            exchangeRate: entryRateOf(value.rateEntry, value.txCurrency ?? globalCurrency),
        });

    const form = useForm({
        defaultValues: initialValues,
        listeners: {
            onChange: ({ formApi, fieldApi }) => {
                if (fieldApi.name !== "income") {
                    return;
                }
                formApi.setFieldValue("category", null);
                formApi.setFieldValue("pendingCategory", null);
                setCategorySource("initial");
            },
        },
        onSubmit: async ({ value }) => {
            setSaveFailure(null);

            const entryCurrency = value.txCurrency ?? globalCurrency;
            const amount = roundToMinorUnits(numpadToNumber(value.amount), entryCurrency);
            const refusal = saveRefusal(amount, entryCurrency);
            if (refusal !== null) {
                haptics("error");
                setSaveFailure(refusal);
                return;
            }

            let categoryId: string | null = null;
            if (value.category) {
                categoryId = value.category.id;
            } else if (value.pendingCategory) {
                const pending = value.pendingCategory;
                try {
                    categoryId = await createPendingCategory(db, pending, value.income, latest.current.categories);
                } catch (error) {
                    console.error("Failed to create the pending category", error);
                    flagMissingCategory();
                    return;
                }
            }

            const baseInput = buildTransactionInput({
                accountId: value.account?.id ?? null,
                // Rounded to the currency's units at save: switching currency mid-entry leaves the typed digits alone,
                // so 12.34 typed in USD would show as ¥12 while the row kept 12.34.
                amount,
                categoryId,
                coefficient: value.coefficient,
                currency: value.txCurrency,
                customColor: identity.color,
                date: value.date,
                details: notesRef.current,
                emoji: identity.emoji,
                endDate: value.endDate,
                exchangeRate: value.exchangeRateType == null ? null : entryRateOf(value.rateEntry, entryCurrency),
                exchangeRateType: value.exchangeRateType,
                hasEndDate: value.hasEndDate,
                icon: identity.icon,
                imageColor: identity.photoColor,
                imageUri: identity.photoUri,
                income: value.income,
                isSubscription: value.isSubscription,
                leadDays: value.leadDays,
                note: value.merchant,
                recurringType: value.recurringType,
            });
            const input: TransactionInput = {
                ...baseInput,
                fee: feeInputFor(value.merchant.trim() || (value.category?.name ?? ""), categoryId, amount),
                paidVia: paysBolivares ? (value.paidVia ?? suggestedPaidVia) : null,
            };
            const writeExtras = async (id: string) => {
                if (tagsSource !== "initial") {
                    const materializedTagIds = await materializeTagIds(db, value.tagIds, value.pendingTagNames);
                    await tagsRepo.writeTagsFor(db, id, materializedTagIds);
                }
                await splitsRepo.writeSplit(
                    db,
                    id,
                    amount,
                    isRealSplit(splitAllocations) ? splitAllocations : [],
                    minorUnitsFor(entryCurrency)
                );
            };
            let savedId: string;
            try {
                savedId = await (installmentOrder.save(input, amount, writeExtras) ??
                    persistTransaction(db, mode, initial, input, writeExtras));
                if (mode === "create") {
                    freshEntries.mark(savedId);
                }
            } catch (error) {
                console.error("Failed to save transaction", error);
                // Say so: un-dimming the CTA in silence reads as a missed tap. Pinned under the header, since a toast
                // would sit under this sheet and the footer must stay pressable.
                haptics("error");
                setSaveFailure(t("transaction.save.failedBody"));
                return;
            }
            posthog?.capture("transaction_saved", {
                has_split: isRealSplit(splitAllocations),
                is_subscription: value.isSubscription,
                mode,
                source: "form",
                transaction_type: value.income ? "income" : "expense",
            });
            // Committed from here down: no failure below may re-enable the CTA, or a second tap mints a fresh id and
            // the ledger gets two subscriptions.
            if (value.account != null) {
                rememberLastUsedAccount(db, value.account.id).catch((error) => {
                    console.error("Failed to remember the account", error);
                });
            }
            if (mode === "create" && queueable(value.merchant)) {
                queueEnrichment(db, savedId)
                    .then(() => sendEnrichmentQueue(db))
                    .catch((error) => {
                        console.error("Failed to queue the merchant lookup", error);
                    });
            }
            const answered = lookupAnsweredRef.current;
            const carryCurrency = value.txCurrency ?? globalCurrency;
            if (
                mode === "edit" &&
                forcedLookupRef.current &&
                answered?.key === merchantKey(value.merchant) &&
                answered.currency === carryCurrency
            ) {
                // Not awaited: the row is saved, and a sibling that would not take the answer is not this save's
                // failure.
                carryLookupToSiblings(savedId, value.income, value.merchant, value.txCurrency).catch((error) => {
                    console.error("Failed to carry the merchant lookup to its other rows", error);
                });
            }
            let scheduleFailed = false;
            if (value.isSubscription) {
                try {
                    await backfillRecurring(db, savedId);
                } catch (error) {
                    console.error("Failed to back-fill the subscription", error);
                    scheduleFailed = true;
                }
            }
            // After the backfill, which moves the chain's next landing. Not awaited: a notification the queue refused
            // must not send this down the catch and re-enable the CTA.
            syncSubscriptionReminders(db).catch((error) => {
                console.error("Subscription reminder sync failed", error);
            });
            if (scheduleFailed) {
                haptics("error");
                // Raised before the dismissal: the root toast outlives this route, while an alert's presenter is gone
                // once the modal tears down.
                notifyFailure({
                    body: t("transaction.save.scheduleFailedBody"),
                    title: t("transaction.save.scheduleFailedTitle"),
                });
                onDone();
                return await holdSubmitting();
            }
            haptics("success");
            if (mode === "create") {
                announceSaved(value, amount);
            }
            onDone();
            if (mode === "create" && !installmentOrder.afterDone()) {
                askForReview(db).catch((error) => {
                    console.error("Failed to ask for a review", error);
                });
            }
            return await holdSubmitting();
        },
        // The footer is never disabled, so a tap with no category lands here.
        onSubmitInvalid: ({ value }) => {
            const fields = formErrorsOf(value)?.fields ?? {};
            if (fields.amount !== undefined) {
                flagMissingAmount();
            }
            if (fields.category !== undefined) {
                flagMissingCategory(fields.amount === undefined);
            }
            if (fields.exchangeRate !== undefined) {
                flagMissingRate(fields.amount === undefined && fields.category === undefined);
            }
            if (fields.amount !== undefined) {
                enterStep("amount");
            } else if (fields.category !== undefined) {
                enterStep("category");
            } else if (fields.exchangeRate !== undefined) {
                enterStep("rateCustom");
            }
        },
        validators: {
            onChange: ({ value }) => formErrorsOf(value),
        },
    });
    // Names the fields: `values` gets a fresh identity on every write, so selecting it re-renders the screen per
    // keystroke.
    const {
        txCurrency,
        isSubscription,
        category,
        pendingCategory,
        income,
        recurringType,
        coefficient,
        account,
        date,
        endDate,
        hasEndDate,
        leadDays,
        rateEntry,
        exchangeRateType,
        fee,
        feeCategoryId,
        paidVia,
        pendingTagNamesNow,
        tagIdsNow,
    } = useSelector(
        form.store,
        (s) => ({
            account: s.values.account,
            category: s.values.category,
            coefficient: s.values.coefficient,
            date: s.values.date,
            endDate: s.values.endDate,
            exchangeRateType: s.values.exchangeRateType,
            fee: s.values.fee,
            feeCategoryId: s.values.feeCategoryId,
            hasEndDate: s.values.hasEndDate,
            income: s.values.income,
            isSubscription: s.values.isSubscription,
            leadDays: s.values.leadDays,
            paidVia: s.values.paidVia,
            pendingCategory: s.values.pendingCategory,
            pendingTagNamesNow: s.values.pendingTagNames,
            rateEntry: s.values.rateEntry,
            recurringType: s.values.recurringType,
            tagIdsNow: s.values.tagIds,
            txCurrency: s.values.txCurrency,
        }),
        { compare: shallowEqual }
    );
    const hasAmount = useSelector(form.store, (s) => numpadToNumber(s.values.amount) > 0);

    const currency = txCurrency ?? globalCurrency;
    const minorUnits = minorUnitsFor(currency);
    const rateSuggestions = useRatesRead(() => transactionRateSuggestions(db, currency, date), [db, currency, date]);
    const rateSelection = rateSelectionOf(rateEntry, exchangeRateType, currency);
    const converts = transactionRateOptions(currency).length > 0;
    const rateInForce = effectiveEntryRate(rateSelection, rateSuggestions);
    const rateUnitLabel = t("transaction.rate.unit", pairUnitSymbols("USD", currency));
    const rateFigure = (rate: number) => formatQuotedRateFigure(currency, rate, language);

    const amountInUsd = (amount: number): number | null =>
        amount <= 0 || rateInForce === null || rateInForce <= 0 ? null : amount / rateInForce;

    const suggestionFor = (type: EntryRateType): number | null => {
        if (type === "custom") {
            return null;
        }
        return type === "official" ? rateSuggestions.official : rateSuggestions.eurReference;
    };

    const rateDeltaNote = (rate: number | null, amount: number): string | null => {
        const { official } = rateSuggestions;
        if (rate === null || official === null) {
            return null;
        }
        return rateDeltaLine(t, {
            bcv: quotedByBcv(currency),
            code: "USD",
            difference: amount > 0 ? amount / rate - amount / official : 0,
            language,
            percent: rateDeltaPercent(currency, rate, official),
        });
    };

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
    const feeRates = useMemo(() => (account == null ? [] : feeRatesOn(db, account.id)), [db, account]);
    const suggestedFeeRate = useMemo(
        () =>
            mode === "create" && foreignCharge && account != null
                ? lastForeignFeeRate(db, account.id, account.currency)
                : null,
        [db, mode, foreignCharge, account]
    );
    const paysBolivares = feeable && currency === "VES" && account?.currency === "VES";
    const paidViaHistory = useMemo(
        () => (mode === "create" && account?.currency === "VES" ? recentPaidVia(db, account.id) : null),
        [db, mode, account]
    );
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
    const feeShown = (): boolean =>
        feeable &&
        (cardFee !== null || (feeDraft.kind === "typed" && (stageStep === "fee" || stageStep === "feeCategory")));
    const feeCategory = useMemo(
        () => getCategoryById(db, feeCategoryId ?? lastFeeCategoryId(db) ?? "") ?? category,
        [db, feeCategoryId, category]
    );
    const feeBase = (amount: number): number | null =>
        cardFeeBase(amount, { card: feeCurrency, entry: currency }, amountInUsd, cardRate);
    const feeAmountFor = (amount: number): number | null => {
        if (cardFee === null || (cardFee.kind === "amount" && cardFee.currency !== feeCurrency)) {
            return null;
        }
        const base = feeBase(amount);
        if (cardFee.kind === "percent" && base === null) {
            return null;
        }
        const charged = cardFeeAmount(cardFee, base ?? 0, feeCurrency);
        return charged > 0 ? charged : null;
    };
    const feeInputFor = (
        merchant: string,
        purchaseCategoryId: string | null,
        amount: number
    ): CardFeeInput | null | undefined => {
        if (initial?.transferId != null || initial?.feeForId != null) {
            return undefined;
        }
        if (cardFee === null) {
            return null;
        }
        const shared = {
            categoryId: feeCategory?.id ?? purchaseCategoryId,
            note: t("transaction.fee.note", { merchant }),
        };
        if (followsPaidVia) {
            const charged = feeAmountFor(amount);
            return charged === null ? null : { ...shared, amount: charged, currency: feeCurrency, rate: null };
        }
        return cardFee.kind === "percent"
            ? { ...shared, amount: null, currency: feeCurrency, rate: cardFee.rate }
            : { ...shared, amount: cardFee.amount, currency: cardFee.currency, rate: null };
    };
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

    // A category carried in from `copyOf` is a choice, not a blank an enrichment suggestion may fill.
    const [categorySource, setCategorySource] = useState<FieldSource>(
        () => restore?.categorySource ?? (initialValues.category === null ? "initial" : "user")
    );

    // Registers a FieldApi so `listeners` fire: `setFieldValue` dispatches through the mounted field, so without it the
    // cascade is a silent no-op.
    useField({ form, name: "income" });

    const [categoryError, setCategoryError] = useState(false);
    const [categoryShake, setCategoryShake] = useState(false);
    const [amountError, setAmountError] = useState(false);
    const [amountShake, setAmountShake] = useState(false);
    const [refusedCurrency, setRefusedCurrency] = useState<string | null>(null);
    const rateMissingAfterRefusal =
        refusedCurrency === currency && transactionRateError(currency, rateSelection) !== null;
    if (refusedCurrency !== null && !rateMissingAfterRefusal) {
        setRefusedCurrency(null);
    }
    const [rateShake, setRateShake] = useState(false);
    const [usdText, setUsdText] = useState("");
    const usdSnapshot = useRef<RateSnapshot>({ entry: NO_RATE, fromSuggestion: false, type: null });
    const celebrate = useAppSettings().state.bool("confetti");
    const announceSaved = (value: typeof initialValues, amount: number) => {
        const chosen = value.category ?? value.pendingCategory;
        const categoryName = chosen?.name ?? "";
        const merchant = value.merchant.trim();
        const body = [merchant ? categoryName : "", value.account?.name ?? ""].filter(Boolean).join(" · ");
        const entryCode = value.txCurrency ?? globalCurrency;
        notifySaved({
            actionLabel: t("transaction.toast.another"),
            amount: {
                label: rowAmountLabel({ amount, code: entryCode, income: value.income }, t),
                text: `${value.income ? "+" : "-"}${formatAmount(amount, entryCode, true, language)}`,
            },
            body: body || undefined,
            onActionPress: () => router.push("/transactions/create"),
            stamp: t(value.isSubscription ? "transaction.toast.subscriptionAdded" : "transaction.toast.added"),
            title: merchant || categoryName,
            tone: {
                identity: resolveTransactionIdentity({
                    categoryColor: chosen?.color ?? null,
                    categoryEmoji: chosen?.emoji ?? null,
                    categoryIcon: chosen?.icon ?? null,
                    customColor: identity.color,
                    emoji: identity.emoji,
                    icon: identity.icon,
                    imageColor: identity.photoColor,
                }),
                imageUri: identity.photoUri,
                income: value.income,
                kind: "entry",
            },
        });
        if (celebrate) {
            celebration.fire();
        }
    };
    const remoteEnrichment = remoteEnrichmentOn(useAppSettings().state.bool);
    const queueable = (merchant: string) => remoteEnrichment && merchant.trim() !== "";
    const groundedLookup = useAppSettings().state.bool("groundedLookup");
    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HERO_REST_TOP);
    const router = useRouter();
    const accountCreateRoute = useAccountCreateRoute();

    const [stage, setStage] = useState<StagePosition>({ forward: true, step: "amount" });
    const stageStep = stage.step;
    const largeText = useAccessibilityTextSize();
    const [stageTurn, setStageTurn] = useState(0);
    const stageTarget = `stage-${stageTurn}`;
    const goStage = (step: StageStep, forward: boolean) => {
        // Unconditional: no step arrives focused, so a standing keyboard would cover the arriving one.
        Keyboard.dismiss();
        rest?.onWake();
        setStage({ forward, step });
        setStageTurn((turn) => turn + 1);
    };
    const enterStep = (step: StageStep) => goStage(step, true);
    const leaveTo = (step: StageStep) => goStage(step, false);
    const {
        applyDerivedRate,
        handleCurrencyChange,
        handleDateChange,
        handleRateSuggestion,
        handleRateTextChange,
        handleRateTypeChange,
        openCustomRate,
        restoreRate,
        snapshotRate,
    } = useTransactionRateControls({
        currency,
        date,
        exchangeRateType,
        initialRateFromProvider: isProviderRate(initial?.exchangeRate, exchangeRateType),
        onStage: goStage,
        setCurrency: (next) => form.setFieldValue("txCurrency", next),
        setDate: (next) => form.setFieldValue("date", next),
        setRate: (next) => form.setFieldValue("rateEntry", next),
        setRateType: (next) => form.setFieldValue("exchangeRateType", next),
        stageStep,
    });
    const rateAgeOf = (type: Exclude<EntryRateType, "custom">, offered: number | null): RateAge => {
        const official = type === "official";
        const suggested = offered === suggestionFor(type);
        const suggestedDate = official ? rateSuggestions.officialDate : rateSuggestions.eurReferenceDate;
        return rateAge(t, {
            entryDate: date,
            fetchedAt: official ? rateSuggestions.officialFetchedAt : rateSuggestions.eurReferenceFetchedAt,
            language,
            now: new Date(),
            rateDate: suggested ? suggestedDate : null,
            use24Hour,
        });
    };
    const rateOptions = (): StepRateOption[] =>
        transactionRateOptions(currency).map((type) => {
            const shared = { name: t(rateNameKey(type, quotedByBcv(currency))), type, unit: rateUnitLabel };
            if (type === "custom") {
                const prior = rateSuggestions.priorCustom;
                const typed = rateSelection.exchangeRateType === "custom" ? rateInForce : null;
                return {
                    ...shared,
                    detail:
                        prior === null
                            ? t("transaction.rate.typeHint")
                            : t("transaction.rate.lastUsed", {
                                  date: formatSentenceDate(prior.date, language),
                                  rate: rateFigure(prior.rate),
                              }),
                    figure: typed === null ? null : rateFigure(typed),
                    placeholder: t("transaction.rate.type"),
                };
            }
            const offered =
                rateSelection.exchangeRateType === type && rateInForce !== null ? rateInForce : suggestionFor(type);
            return {
                ...shared,
                ...rateAgeOf(type, offered),
                figure: offered === null ? null : rateFigure(offered),
                placeholder: t("transaction.rate.unavailable"),
            };
        });
    const selectRateOption = (type: EntryRateType) => {
        if (type === "custom") {
            const hasCustom = rateSelection.exchangeRateType === "custom" && rateInForce !== null;
            openCustomRate(hasCustom ? null : (rateSuggestions.priorCustom?.rate ?? null));
            return;
        }
        const offered =
            rateSelection.exchangeRateType === type && rateInForce !== null ? rateInForce : suggestionFor(type);
        if (offered === null) {
            handleRateTypeChange(type);
            return;
        }
        handleRateSuggestion(offered, type);
    };
    const providerReferences = () =>
        transactionRateOptions(currency).flatMap((type) => {
            const offered = suggestionFor(type);
            return offered === null
                ? []
                : [
                      {
                          figure: rateFigure(offered),
                          label: t(rateNameKey(type, quotedByBcv(currency))),
                          onPress: () => handleRateSuggestion(offered, type),
                      },
                  ];
        });
    const customRateValue = (typing: boolean, typed: boolean): string => {
        if (typed) {
            return rateEntry.text.replace(".", numberLocale(language).decimal);
        }
        return rateInForce === null || typing ? t("transaction.rate.type") : rateFigure(rateInForce);
    };
    const rateClause = (amountNumber: number): TransactionRateClause => {
        const usd = amountInUsd(amountNumber);
        const type = rateSelection.exchangeRateType;
        const missing = rateInForce === null;
        let template = t("transaction.sentence.rate.provider");
        if (missing) {
            template = t("transaction.sentence.rate.missing");
        } else if (type === "custom") {
            template = t("transaction.sentence.rate.custom");
        }
        return {
            converted: usd === null ? null : { amount: usd, text: formatAmount(usd, "USD", true, language) },
            flagged: rateMissingAfterRefusal,
            missing,
            onConvertedPress: openUsd,
            onSourcePress: () => enterStep("rate"),
            shake: rateShake,
            source: t(rateSourceWordKey(type, quotedByBcv(currency))),
            template,
        };
    };
    const openUsd = () => {
        usdSnapshot.current = snapshotRate(rateEntry);
        setUsdText("");
        enterStep("rateUsd");
    };
    const typeUsd = (next: string, amountNumber: number) => {
        setUsdText(next);
        const usd = numpadToNumber(next);
        if (usd > 0 && amountNumber > 0) {
            applyDerivedRate(amountNumber / usd);
            return;
        }
        restoreRate(usdSnapshot.current);
    };
    const favouriteCurrencies = useFavouriteCurrencies(db);
    const toggleFavourite = useToggleFavouriteCurrency(db);
    const selectCategory = (picked: Category) => {
        form.setFieldValue("category", picked);
        form.setFieldValue("pendingCategory", null);
        setCategorySource("user");
        markTouched("category");
        setCategoryError(false);
    };
    const tagSheetRef = useRef<BottomSheetModal>(null);
    const splitSheetRef = useRef<BottomSheetModal>(null);
    const {
        allocations: splitAllocations,
        openSplit,
        setAllocations: setSplitAllocations,
    } = useSplitDraft(db, mode, initial, restore?.splitAllocations);
    const allAccounts = useBankAccounts(db);
    const people = usePeople(db);
    const installmentOrder = useInstallmentOrder({
        account,
        banks: allAccounts,
        currency,
        date,
        db,
        entryRate: { rate: rateInForce, type: rateSelection.exchangeRateType },
        income,
        initial,
        intent: seed?.installments === true,
        isSubscription,
        mode,
        seeded: seed?.installmentDraft,
    });
    const saveRefusal = (amount: number, entryCurrency: string): string | null => {
        if (isRealSplit(splitAllocations) && !isBalanced(amount, splitAllocations, minorUnitsFor(entryCurrency))) {
            splitSheetRef.current?.present();
            return t("transaction.split.unbalanced");
        }
        return installmentOrder.problem(amount);
    };
    const installmentPrice = useSelector(form.store, (s) =>
        installmentOrder.drafting ? numpadToNumber(s.values.amount) : 0
    );
    const promptInstallments = useEffectEvent((_turn: number) => installmentOrder.prompt(hasAmount));
    useEffect(() => {
        promptInstallments(stageTurn);
    }, [stageTurn]);
    const [accountDeclined, setAccountDeclined] = useState(
        restore?.accountDeclined ?? (initial != null && initial.accountId == null)
    );
    const recentNames = useRecentMerchants(db, income);
    const allTags = useTags(db);
    const savedTagIds = useTagIdsFor(db, initial?.id ?? null);
    const [tagsSource, setTagsSource] = useState<FieldSource>(restore?.tagsSource ?? "initial");
    // Until touched, the row's tags are the saved ones: the field is still the empty array it mounted with.
    const effectiveTagIdsOf = (tagIds: readonly string[]) => (tagsSource === "initial" ? savedTagIds : tagIds);
    const tagLabelsOf = (tagIds: readonly string[], pendingTagNames: readonly string[]) => [
        ...allTags.filter((tag) => effectiveTagIdsOf(tagIds).includes(tag.id)).map((tag) => tag.name),
        ...pendingTagNames,
    ];
    const splitLabel = (count: number) => t("transaction.sentence.set.split", { count });
    const repeatChipLabel = () => {
        if (recurringType === RECURRING_TYPE.daily) {
            return t("transaction.sentence.set.repeatDaily");
        }
        if (recurringType === RECURRING_TYPE.weekly) {
            return t("transaction.sentence.set.repeatWeekly");
        }
        if (recurringType === RECURRING_TYPE.yearly) {
            return t("transaction.sentence.set.repeatYearly");
        }
        return t("transaction.sentence.set.repeatMonthly");
    };
    const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
    const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const amountShakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rateShakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const categoriesForNamespace = useCategoriesByNamespace(db, income);
    // Shape only: the names and what sits under what. No figures leave here.
    const categoryTree = useMemo(() => {
        const named = categoriesForNamespace.filter((candidate) => candidate.name != null);
        // SAFETY: `named` is filtered to non-null names above; the column is nullable.
        return named
            .filter((candidate) => candidate.parentId == null)
            .map((parent) => ({
                // SAFETY on both lines: `named` is filtered to non-null names above.
                children: named.filter((child) => child.parentId === parent.id).map((child) => child.name as string),
                name: parent.name as string,
            }));
    }, [categoriesForNamespace]);

    const resolveHistory = useCallback(
        (key: string, forIncome: boolean) => rememberedCategoryFor(db, key, forIncome),
        [db]
    );

    const recallBookMerchant = useCallback(
        (name: string, forCurrency: string | undefined) => recallMerchant(db, name, forCurrency),
        [db]
    );

    const logoRequestRef = useRef(0);
    // Read at write time, not closed over: the seeding effect can fill the well while a request is out. Mirrored in an
    // effect, since a render-time write is a side effect the compiler cannot follow.
    const latest = useRef({
        allTags,
        categories: categoriesForNamespace,
        hasIdentity: false,
        identitySource,
        pickerOpen,
    });
    useEffect(() => {
        latest.current = {
            allTags,
            categories: categoriesForNamespace,
            hasIdentity: Boolean(identity.emoji || identity.icon || identity.photoUri),
            identitySource,
            pickerOpen,
        };
    });

    const resolveLocal = (suggestion: EnrichmentSuggestion): EnrichmentSuggestion => {
        let { categoryId, pendingCategory: suggestedCategory } = suggestion;
        if (categoryId == null && suggestedCategory != null) {
            const matchedCategory = latest.current.categories.find(
                (candidate) => candidate.name === suggestedCategory?.name
            );
            if (matchedCategory != null) {
                categoryId = matchedCategory.id;
                suggestedCategory = null;
            }
        }
        const resolvedTagIds: string[] = [...suggestion.tagIds];
        const pendingTagNames: string[] = [];
        for (const tagName of suggestion.pendingTagNames) {
            const matchedTag = findTagByName(latest.current.allTags, tagName);
            if (matchedTag == null) {
                pendingTagNames.push(tagName);
            } else {
                resolvedTagIds.push(matchedTag.id);
            }
        }
        return {
            ...suggestion,
            categoryId,
            pendingCategory: suggestedCategory,
            pendingTagNames,
            tagIds: resolvedTagIds,
        };
    };

    // The user asked for this merchant's lookup and has not retyped the name: guards that keep suggestions off filled
    // fields lift, and the save carries the answer to the merchant's other rows.
    const forcedLookupRef = useRef(false);
    // Carried to siblings only when this matches the screen: a save before the answer, or after an empty one, must not
    // hand the row's old category to rows that had none.
    const lookupAnsweredRef = useRef<{ currency: string | null; key: string } | null>(null);
    // The one place this ref is set: the compiler allows a captured ref to change inside one hook's callback, not two.
    const recordLookupAnswer = useCallback((answer: { currency: string | null; key: string } | null) => {
        lookupAnsweredRef.current = answer;
    }, []);
    const setForcedLookup = useCallback(
        (forced: boolean) => {
            forcedLookupRef.current = forced;
            if (forced) {
                touchedSinceLookupRef.current.clear();
                // A new ask starts unanswered, so the previous answer cannot let a save carry.
                recordLookupAnswer(null);
            }
        },
        [recordLookupAnswer]
    );

    // A late answer may replace only slots left alone since the ask: a category picked meanwhile is newer.
    const touchedSinceLookupRef = useRef<Set<"category" | "identity" | "tags">>(new Set());
    const markTouched = useCallback((slot: "category" | "identity" | "tags") => {
        touchedSinceLookupRef.current.add(slot);
    }, []);
    const suggestedDomainRef = useRef<string | null>(null);

    // A suggested logo stays replaceable so it follows the name; only a user choice or an open picker stops it. A run
    // that settles after a newer one started is dropped.
    const attachLogo = async (domain: string | null): Promise<boolean> => {
        const blocked = () =>
            latest.current.pickerOpen ||
            // A requested lookup outranks what the well holds; only an open picker outranks it.
            ((!forcedLookupRef.current || touchedSinceLookupRef.current.has("identity")) &&
                (latest.current.identitySource === "user" ||
                    // An emoji or photo from `initial`/`copyOf` is a choice already made.
                    (latest.current.identitySource === "initial" && latest.current.hasIdentity)));
        if (blocked()) {
            return false;
        }
        logoRequestRef.current += 1;
        const ticket = logoRequestRef.current;
        // This pipeline is awaited on its own, so a rename during the next debounce would otherwise take the previous
        // merchant's logo.
        const askedFor = merchantKey(form.store.state.values.merchant);
        const stale = () =>
            ticket !== logoRequestRef.current ||
            merchantKey(form.store.state.values.merchant) !== askedFor ||
            blocked();
        const dropSuggested = () => {
            if (latest.current.identitySource === "suggested") {
                setIdentitySource("initial");
                setIdentity((previous) => ({
                    ...previous,
                    photoColor: null,
                    photoUri: null,
                }));
            }
        };

        // Dropped now, not after a fetch: a save in that gap would keep the wrong brand on the row.
        if (domain == null) {
            dropSuggested();
            return false;
        }
        const outcome = await fetchMerchantImage({
            domain,
            name: form.store.state.values.merchant,
            refresh: forcedLookupRef.current,
        });
        if (stale()) {
            return false;
        }
        if (outcome.kind !== "logo") {
            dropSuggested();
            return false;
        }
        // SAFETY: untyped `require` of a first-party module, asserted to its own type. Lazy so rendering the form does
        // not pull Skia's downscaler into the module graph, as in `domain/ids.ts`.
        const photoStorage = require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
        let photoUri: string;
        try {
            photoUri = await photoStorage.persistLogoBytes(outcome.bytes);
        } catch {
            return false;
        }
        const hues = await glowFromImage(photoUri);
        if (stale()) {
            // Nothing will name this file: the row moved on, or the form unmounted (which bumps the ticket).
            try {
                photoStorage.photoFiles.remove(photoUri.slice(photoUri.lastIndexOf("/") + 1));
            } catch {
                // A file already gone is the outcome wanted.
            }
            return false;
        }
        suggestedDomainRef.current = domain;
        setIdentitySource("suggested");
        const replacesChoice = forcedLookupRef.current && !touchedSinceLookupRef.current.has("identity");
        setIdentity((previous) => ({
            ...previous,
            emoji: replacesChoice ? null : previous.emoji,
            icon: replacesChoice ? null : previous.icon,
            photoColor: hues[0] ?? null,
            photoUri,
        }));
        return true;
    };
    useEffect(
        () => () => {
            logoRequestRef.current += 1;
        },
        []
    );

    // Not `useCallback`: it reads and sets `categorySource` and `tagsSource`, which made the compiler decline the whole
    // form. Its only consumer reads it through a committed snapshot, so its identity may change.
    const applySuggestion = (suggestion: EnrichmentSuggestion) => {
        // From the ref: the curated tier answers in the same tick the lookup is asked, before state commits.
        const forced = forcedLookupRef.current;
        const answeredWithoutDomain =
            suggestion.categoryId != null ||
            suggestion.pendingCategory != null ||
            suggestion.tagIds.length > 0 ||
            suggestion.pendingTagNames.length > 0;
        const answered = answeredWithoutDomain || suggestion.domain != null;
        const answer = { currency, key: merchantKey(form.store.state.values.merchant) };
        // A domain alone is an answer only once its logo is on the row, or the save would carry a logo this row lacks.
        if (forced && answered && (suggestion.domain == null || answeredWithoutDomain)) {
            recordLookupAnswer(answer);
        }
        const touched = touchedSinceLookupRef.current;
        if ((forced && !touched.has("category")) || categorySource !== "user") {
            if (suggestion.categoryId != null) {
                const matchedCategory = getCategoryById(db, suggestion.categoryId);
                if (matchedCategory != null) {
                    form.setFieldValue("category", matchedCategory, { dontUpdateMeta: true });
                    form.setFieldValue("pendingCategory", null, { dontUpdateMeta: true });
                    setCategoryError(false);
                    setCategorySource("suggested");
                }
            } else if (suggestion.pendingCategory != null) {
                form.setFieldValue("category", null, { dontUpdateMeta: true });
                form.setFieldValue("pendingCategory", suggestion.pendingCategory, { dontUpdateMeta: true });
                setCategoryError(false);
                setCategorySource("suggested");
            } else if (categorySource === "suggested") {
                form.setFieldValue("category", null, { dontUpdateMeta: true });
                form.setFieldValue("pendingCategory", null, { dontUpdateMeta: true });
                setCategorySource("initial");
            }
        }
        // Tags an edit opened with are the user's, but they arrive by query rather than with `initial`, so the guard
        // reads them at apply time.
        const savedTagsStand = tagsSource === "initial" && savedTagIds.length > 0;
        if ((forced && !touched.has("tags")) || (tagsSource !== "user" && !savedTagsStand)) {
            if (suggestion.tagIds.length > 0 || suggestion.pendingTagNames.length > 0) {
                form.setFieldValue("tagIds", [...suggestion.tagIds], { dontUpdateMeta: true });
                form.setFieldValue("pendingTagNames", [...suggestion.pendingTagNames], { dontUpdateMeta: true });
                setTagsSource("suggested");
            } else if (tagsSource === "suggested") {
                form.setFieldValue("tagIds", [], { dontUpdateMeta: true });
                form.setFieldValue("pendingTagNames", [], { dontUpdateMeta: true });
                setTagsSource("initial");
            }
        }
        attachLogo(suggestion.domain)
            .then((landed) => {
                if (landed && forcedLookupRef.current && merchantKey(form.store.state.values.merchant) === answer.key) {
                    recordLookupAnswer(answer);
                }
            })
            .catch(() => undefined);
    };

    const locale = useLocaleTag();
    const regionCode = useRegionCode();
    const liabilities = allAccounts.filter((candidate) => toAccountKind(candidate.kind) === "liability");
    const installmentsNarrowed = seed?.installments === true && !income;
    const {
        lookupNow,
        onNameChange,
        pending: enriching,
    } = useTransactionEnrichment({
        categoryTree,
        currency,
        enabled: true,
        groundedLookup,
        income,
        initialName: nameSeed,
        locale,
        onSuggest: applySuggestion,
        recallMerchant: recallBookMerchant,
        regionCode,
        remoteEnabled: remoteEnrichment,
        resolveHistory,
        resolveLocal,
    });
    const categoryEnriching = enriching && categorySource !== "user";

    // The hook re-asks on a currency or side change; that ask is the form's, not the user's, so the override ends here.
    const seenLookupScopeRef = useRef({ currency, income });
    useEffect(() => {
        const seen = seenLookupScopeRef.current;
        if (seen.currency === currency && seen.income === income) {
            return;
        }
        seenLookupScopeRef.current = { currency, income };
        setForcedLookup(false);
    }, [currency, income, setForcedLookup]);

    const lookUpMerchant = () => {
        rest?.onWake();
        setForcedLookup(true);
        haptics("light");
        lookupNow().catch(() => undefined);
    };

    // Read back from the saved row: a pending category only gets an id at save. `forCurrency` is the row's own column
    // (null in the default currency), so siblings stored the same way match.
    const carryLookupToSiblings = async (
        savedId: string,
        forIncome: boolean,
        merchant: string,
        forCurrency: string | null
    ) => {
        const saved = getTransactionById(db, savedId);
        const touched = touchedSinceLookupRef.current;
        const carryCategory = categorySource === "suggested" && !touched.has("category");
        const carryTags = tagsSource === "suggested" && !touched.has("tags");
        const domain = identitySource === "suggested" && !touched.has("identity") ? suggestedDomainRef.current : null;
        const persistLogo =
            domain == null
                ? null
                : async () => {
                      const outcome = await fetchMerchantImage({ domain, name: merchant });
                      if (outcome.kind !== "logo") {
                          throw new Error("No logo to carry");
                      }
                      const imageUri = await photoStorage.persistLogoBytes(outcome.bytes);
                      return { imageColor: saved?.imageColor ?? null, imageUri };
                  };
        // SAFETY: untyped `require`, asserted to the module's own type; lazy as in `attachLogo`.
        const photoStorage = require("@/lib/photo-storage") as typeof import("@/lib/photo-storage");
        await applyMerchantToSiblings(db, {
            categoryId: carryCategory ? (saved?.categoryId ?? null) : null,
            currency: forCurrency,
            defaultCurrency: globalCurrency,
            discard: (imageUri) => {
                photoStorage.photoFiles.remove(imageUri.slice(imageUri.lastIndexOf("/") + 1));
            },
            excludeId: savedId,
            income: forIncome,
            key: merchantKey(merchant),
            persistLogo,
            tagIds: carryTags ? await tagIdsForQuery(db, savedId).then((rows) => rows.map((row) => row.tagId)) : [],
        });
    };

    useEffect(
        () => () => {
            if (shakeTimer.current != null) {
                clearTimeout(shakeTimer.current);
            }
            if (amountShakeTimer.current != null) {
                clearTimeout(amountShakeTimer.current);
            }
            if (rateShakeTimer.current != null) {
                clearTimeout(rateShakeTimer.current);
            }
        },
        []
    );

    const [restoredIdentity] = useState(() =>
        restore !== undefined && restore.identitySource !== "initial" ? restore.identity : null
    );
    useEffect(() => {
        if (restoredIdentity !== null) {
            setIdentity(restoredIdentity);
        }
    }, [restoredIdentity, setIdentity]);

    useEffect(() => {
        // Skipped once identity is touched or suggested: these deps change on any `initial`/`copyOf` re-render, and
        // re-seeding would wipe an in-progress choice or a logo still correct for the name.
        if (identitySource !== "initial") {
            return;
        }
        setIdentity({
            color: initial?.customColor ?? copyOf?.customColor ?? null,
            emoji: initial?.emoji ?? copyOf?.emoji ?? null,
            icon: initial?.icon ?? copyOf?.icon ?? null,
            photoColor: initial?.imageColor ?? null,
            photoUri: initial?.imageUri ?? null,
        });
    }, [
        identitySource,
        initial?.imageUri,
        initial?.emoji,
        setIdentity,
        initial?.imageColor,
        initial?.icon,
        initial?.customColor,
        copyOf?.emoji,
        copyOf?.icon,
        copyOf?.customColor,
    ]);

    const handleKindChange = (next: "once" | "subscription") => {
        const sub = next === "subscription";
        form.setFieldValue("isSubscription", sub);
        if (sub) {
            form.setFieldValue("recurringType", ensureRecurringType(recurringType));
        }
    };

    const handleTypeChange = (next: "expense" | "income") => {
        const nextIncome = next === "income";
        if (nextIncome !== income) {
            form.setFieldValue("income", nextIncome);
        }
    };

    // Picking a lead here is the intent behind the master switch: a ledger whose owner never opened the notifications
    // screen would otherwise arm nothing.
    const armSubscriptionReminders = async () => {
        await setBoolSetting(db, "subscriptionReminders", true);
    };

    const confirmRemindersAllowed = async () => {
        const existing = await reminderPermission();
        if (enableReminderStep(existing) === "open-settings") {
            Alert.alert(t("settings.notifications.deniedTitle"), t("settings.notifications.deniedBody"), [
                { style: "cancel", text: t("settings.notifications.notNow") },
                {
                    onPress: openNotificationSettings,
                    text: t("settings.notifications.openSettings"),
                },
            ]);
            form.setFieldValue("leadDays", null);
            return;
        }
        if (existing === "granted") {
            await armSubscriptionReminders();
            return;
        }
        if ((await requestReminderPermission()) === "granted") {
            await armSubscriptionReminders();
            return;
        }
        form.setFieldValue("leadDays", null);
    };

    const confirmLead = () => {
        confirmRemindersAllowed().catch((error) => {
            console.error("Reminder permission check failed", error);
        });
    };

    const handleLeadChange = (lead: number | null) => {
        form.setFieldValue("leadDays", lead);
        if (lead !== null && isSubscription) {
            confirmLead();
        }
    };

    const startRepeating = (type: number, every: number) => {
        form.setFieldValue("recurringType", type);
        form.setFieldValue("coefficient", every);
        form.setFieldValue("isSubscription", true);
        if (!isSubscription && leadDays !== null) {
            confirmLead();
        }
    };

    const flagMissingCategory = (announce = true) => {
        haptics("error");
        if (announce) {
            AccessibilityInfo.announceForAccessibility(t("transaction.category.required"));
        }
        setCategoryError(true);
        setCategoryShake(true);
        shakeTimer.current = setTimeout(() => setCategoryShake(false), 500);
    };

    // Save is never `disabled`: pressing an incomplete entry says what is missing. Flagging only marks the word; the
    // caller lands on the first reason, not whichever flagged last.
    const flagMissingAmount = () => {
        haptics("error");
        AccessibilityInfo.announceForAccessibility(t("transaction.amount.required"));
        setAmountError(true);
        setAmountShake(true);
        amountShakeTimer.current = setTimeout(() => setAmountShake(false), 500);
    };

    const flagMissingRate = (announce = true) => {
        haptics("error");
        if (announce) {
            AccessibilityInfo.announceForAccessibility(t("transaction.rate.required"));
        }
        setRefusedCurrency(currency);
        setRateShake(true);
        rateShakeTimer.current = setTimeout(() => setRateShake(false), 500);
    };

    // The spring starts on the tap frame, not the picker route's mount, so the hero does not wait on navigation.
    const openPicker = () => {
        // Or the note's keyboard stays standing over the pushed picker.
        Keyboard.dismiss();
        setIdentitySource("user");
        markTouched("identity");
        setPickerOpen(true);
        router.push("/transactions/identity");
    };

    const ctaLabel = t(ctaKey(mode, isSubscription));

    const curtainHues = computeCurtainHues(
        {
            categoryColor: category?.color,
            foregroundColor: colors.foreground,
            identity,
            income,
            incomeColor: colors.income,
        },
        glowFromEmoji
    );

    const chosenCategoryTint = category?.income ? colors.income : (category?.color ?? colors.foreground);
    const categoryGlyphTint = category ? chosenCategoryTint : (pendingCategory?.color ?? colors.muted);

    const formDirty = useSelector(form.store, (state) => state.isDirty);
    const [edited, setEdited] = useState(restore !== undefined);
    const dirty = formDirty || edited || identitySource === "user";
    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const [noteOpen, setNoteOpen] = useState(notesSeed.length > 0);
    const [noteAsked, setNoteAsked] = useState(false);
    const [noteSummary, setNoteSummary] = useState(notesSeed);

    useLayoutEffect(() => {
        if (draftRef === undefined) {
            return;
        }
        draftRef.current = () => ({
            accountDeclined,
            categorySource,
            identity,
            identitySource,
            notes: notesRef.current,
            splitAllocations,
            tagsSource,
            values: form.state.values,
        });
        return () => {
            draftRef.current = null;
        };
    });

    // Narrow subscription: `useAppSettings().state` would re-render the form on every unrelated setting write.
    const coachSeen = useSettingBool("sentenceCoachSeen");
    const setSetting = useAppSettings().actions.setBool;
    const showCoach = mode === "create" && !coachSeen;
    const dismissCoach = () => setSetting("sentenceCoachSeen", true);

    const answered = (step: GuidedStep, amountNumber: number, merchant: string): boolean => {
        if (step === "amount") {
            return amountNumber > 0;
        }
        if (step === "merchant") {
            return merchant.trim() !== "";
        }
        if (step === "category") {
            return categoryLabel !== null || queueable(merchant);
        }
        return (
            account != null ||
            accountDeclined ||
            (allAccounts.length === 0 && !seed?.accountUnresolved && !installmentsNarrowed)
        );
    };

    const nextMissing = (amountNumber: number, merchant: string, from: number): GuidedStep | null =>
        GUIDED_STEPS.slice(from).find((step) => !answered(step, amountNumber, merchant)) ?? null;

    const entryWhole = (amountNumber: number, merchant: string, skipped?: GuidedStep): boolean =>
        GUIDED_STEPS.every(
            (step) => step === skipped || OPTIONAL_STEPS.has(step) || answered(step, amountNumber, merchant)
        );

    const advanceFrom = (step: StageStep, amountNumber: number, merchant: string): StageStep =>
        nextMissing(amountNumber, merchant, guidedIndex(step) + 1) ?? "amount";

    const advance = (step: StageStep, amountNumber: number, merchant: string) => {
        const next = advanceFrom(step, amountNumber, merchant);
        goStage(next, next !== "amount");
    };

    // Walks forward from the step on screen: pressing it on the step it asks for is the skip, so a backward target
    // would loop. Out of ladder it submits, so a still-missing fact says so.
    const stageFooter = (amountNumber: number, merchant: string): StageFooter => {
        const whole = entryWhole(amountNumber, merchant);
        const onward = whole ? null : nextMissing(amountNumber, merchant, guidedIndex(stageStep) + 1);
        const saves = whole || (stageStep === "account" && entryWhole(amountNumber, merchant, "account"));
        return {
            label: saves ? ctaLabel : t("common.next"),
            onPress: () => {
                if (onward === null) {
                    pressSubmit(form);
                    return;
                }
                enterStep(onward);
            },
            tone: saves ? "primary" : "muted",
        };
    };

    const activeSlot: TransactionSentenceMark = STEP_SLOTS[stageStep];

    // `merchantSeed` is left alone: re-seeding that field mid-keystroke would take the caret with it.
    const handleMerchantChange = (next: string) => {
        setForcedLookup(false);
        form.setFieldValue("merchant", next);
        onNameChange(next);
    };

    // The sentence's field is uncontrolled, so moving it means re-seeding it.
    const handleStageMerchantChange = (next: string) => {
        form.setFieldValue("merchantSeed", next);
        handleMerchantChange(next);
    };

    const sentenceLabels = {
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

    const whenLabel = transactionWhenLabel(t, {
        date,
        interval: isSubscription ? intervalPhrase(t, recurringType, coefficient) : null,
        language,
        now: new Date(),
    });

    const categoryLabel = category?.name ?? pendingCategory?.name ?? null;
    let categoryTile: ReactNode;
    if (categoryEnriching) {
        categoryTile = <ThinkingOrb state="searching" />;
    } else if (category || pendingCategory) {
        categoryTile = (
            <CategoryIcon color={categoryGlyphTint} name={category ? category.icon : pendingCategory?.icon} size={20} />
        );
    }
    const accountTile = account ? <AccountTile account={account} size={20} /> : undefined;
    const hasIdentityMark = Boolean(identity.photoUri ?? identity.emoji ?? identity.icon);
    const merchantTile = hasIdentityMark ? (
        <CategoryIconTile
            color={identity.photoColor ?? identity.color ?? colors.foreground}
            emoji={identity.emoji}
            icon={identity.icon}
            imageUri={identity.photoUri}
            size={20}
            type="solid"
        />
    ) : undefined;

    // oxlint-disable-next-line complexity -- one branch per step of a single surface; splitting it per step would hide the fact that they are alternatives.
    const stageStepContent = (amountNumber: number, merchant: string): StageStepContent => {
        if (stageStep === "fee") {
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
                        onLoggedAsPress={() => enterStep("feeCategory")}
                        onSelect={(id) => {
                            if (id === "paidVia") {
                                form.setFieldValue("fee", null);
                                leaveTo("amount");
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
                            leaveTo("amount");
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
        }
        if (stageStep === "paidVia") {
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
                            leaveTo("amount");
                        }}
                        options={options}
                        selectedId={paidViaNow}
                    />
                ),
                title: t("transaction.paidVia.title"),
            };
        }
        if (stageStep === "feeCategory") {
            return {
                body: (
                    <StepCategory
                        categories={categoriesForNamespace}
                        onCreate={() => router.push("/settings/categories/create")}
                        onSelect={(picked) => {
                            form.setFieldValue("feeCategoryId", picked.id);
                            rememberFeeCategory(db, picked.id).catch((error) => {
                                console.error("Failed to remember the fee category", error);
                            });
                            leaveTo("fee");
                        }}
                        selectedId={feeCategory?.id ?? null}
                    />
                ),
                title: t("transaction.fee.loggedAs"),
            };
        }
        if (stageStep === "merchant") {
            return {
                body: (
                    <StepMerchant
                        accessibilityLabel={t("transaction.merchant.field")}
                        onChange={handleStageMerchantChange}
                        placeholder={t("transaction.field.namePlaceholder")}
                        recent={recentNames}
                        recentLabel={t("transaction.merchant.recent")}
                        suggestions={suggestMerchants(merchant, MERCHANT_SUGGESTION_LIMIT, recentNames)}
                        value={merchant}
                    />
                ),
                title: t("transaction.field.name"),
            };
        }
        if (stageStep === "category") {
            return {
                body: (
                    <StepCategory
                        categories={categoriesForNamespace}
                        onCreate={() => router.push("/settings/categories/create")}
                        onSelect={(picked) => {
                            selectCategory(picked);
                            advance("category", amountNumber, merchant);
                        }}
                        selectedId={category?.id ?? null}
                    />
                ),
                title: t("transaction.field.category"),
            };
        }
        if (stageStep === "account") {
            const pickAccount = (picked: Account | null) => {
                form.setFieldValue("account", picked);
                setAccountDeclined(picked === null);
                advance("account", amountNumber, merchant);
            };
            const apps = income ? null : (
                <StepAccountInstallments
                    accounts={allAccounts}
                    onPick={pickAccount}
                    searchable={installmentsNarrowed}
                />
            );
            return {
                body:
                    installmentsNarrowed && liabilities.length === 0 ? (
                        apps
                    ) : (
                        <StepAccount
                            accounts={installmentsNarrowed ? liabilities : allAccounts}
                            after={apps}
                            allowNone={!installmentsNarrowed}
                            onSelect={pickAccount}
                            people={installmentsNarrowed ? undefined : people}
                            selectedId={account?.id ?? null}
                        />
                    ),
                title: t("transaction.field.account"),
            };
        }
        if (stageStep === "currency") {
            return {
                body: (
                    <StepCurrency
                        favourites={favouriteCurrencies}
                        listMinHeight={currencyListHeight}
                        onSelect={(next) => {
                            handleCurrencyChange(next);
                            leaveTo("amount");
                        }}
                        onToggleFavourite={toggleFavourite}
                        searchPlaceholder={t("onboarding.currency.picker.searchPlaceholder")}
                        selected={currency}
                    />
                ),
                title: t("onboarding.currency.picker.title"),
            };
        }
        if (stageStep === "rate") {
            return {
                body: (
                    <StepRate
                        onSelect={selectRateOption}
                        options={rateOptions()}
                        selected={rateSelection.exchangeRateType}
                    />
                ),
                footer: { label: t("common.done"), onPress: () => leaveTo("amount") },
                title: t("transaction.rate.title"),
            };
        }
        if (stageStep === "rateCustom") {
            const typing = rateSelection.exchangeRateType === "custom";
            const typed = typing && rateEntry.text !== "";
            return {
                body: (
                    <StepRateField
                        error={rateMissingAfterRefusal ? t("transaction.rate.required") : null}
                        note={typed ? rateDeltaNote(rateInForce, amountNumber) : null}
                        placeholder={!typed}
                        references={providerReferences()}
                        unit={rateUnitLabel}
                        value={customRateValue(typing, typed)}
                    >
                        <AmountNumpad
                            code={currency}
                            minorUnits={RATE_ENTRY_DECIMALS}
                            mode="explicitSeparator"
                            onChange={handleRateTextChange}
                            showDisplay={false}
                            value={typing ? rateEntry.text : ""}
                        />
                    </StepRateField>
                ),
                footer: {
                    label:
                        typed && rateInForce !== null
                            ? t("transaction.rate.use", { value: rateFigure(rateInForce) })
                            : t("common.done"),
                    onPress: () => {
                        if (typing && rateInForce === null) {
                            flagMissingRate();
                            return;
                        }
                        leaveTo("amount");
                    },
                },
                title: t("transaction.rate.custom"),
            };
        }
        if (stageStep === "rateUsd") {
            const usd = numpadToNumber(usdText);
            const derivedNote =
                usd > 0 && rateInForce !== null
                    ? [
                          t("transaction.rate.derived", { rate: `${rateFigure(rateInForce)} ${rateUnitLabel}` }),
                          rateDeltaNote(rateInForce, 0),
                      ]
                          .filter((line) => line !== null)
                          .join(" · ")
                    : null;
            return {
                body: (
                    <StepRateField
                        error={null}
                        figure={{ amount: usd, code: "USD" }}
                        note={derivedNote}
                        placeholder={usd <= 0}
                        value={formatAmount(usd > 0 ? usd : (amountInUsd(amountNumber) ?? 0), "USD", true, language)}
                    >
                        <AmountNumpad
                            code="USD"
                            minorUnits={minorUnitsFor("USD")}
                            onChange={(next) => typeUsd(next, amountNumber)}
                            showDisplay={false}
                            value={usdText}
                        />
                    </StepRateField>
                ),
                footer: {
                    label:
                        usd > 0
                            ? t("transaction.rate.use", { value: formatAmount(usd, "USD", true, language) })
                            : t("common.done"),
                    onPress: () => leaveTo("amount"),
                },
                title: t("transaction.rate.inDollars"),
            };
        }
        if (stageStep === "when") {
            return {
                body: (
                    <StepWhen
                        date={date}
                        now={new Date()}
                        onPick={() => enterStep("date")}
                        onSelect={(next) => {
                            handleDateChange(next);
                            advance("when", amountNumber, merchant);
                        }}
                        pickLabel={t("transaction.sentence.when.pick")}
                    />
                ),
                title: t("transaction.field.date"),
            };
        }
        if (stageStep === "date") {
            return {
                body: <StepDate date={date} onChange={handleDateChange} withTime />,
                title: t("transaction.field.date"),
            };
        }
        if (stageStep === "endDate") {
            return {
                body: (
                    <StepDate
                        date={endDate}
                        onChange={(next) => {
                            form.setFieldValue("endDate", next);
                            form.setFieldValue("hasEndDate", true);
                        }}
                    />
                ),
                rightAction: {
                    label: t("common.never"),
                    onPress: () => {
                        form.setFieldValue("hasEndDate", false);
                        leaveTo("repeat");
                    },
                },
                title: t("transaction.field.ends"),
            };
        }
        return {
            body: (
                <StepRepeat
                    cadence={isSubscription ? recurringType : RECURRING_TYPE.none}
                    custom={coefficient !== 1}
                    customLabel={
                        coefficient === 1
                            ? undefined
                            : t("transaction.schedule.every", {
                                  interval: intervalPhrase(t, recurringType, coefficient),
                              })
                    }
                    endDate={hasEndDate ? endDate : null}
                    labels={{
                        ending: t("transaction.schedule.ending"),
                        endingOpen: t("transaction.schedule.endingOpen"),
                        openEnd: t("transaction.schedule.openEnd"),
                        starting: t("transaction.schedule.starting"),
                    }}
                    leadDays={leadDays}
                    onCadenceChange={(type) => startRepeating(type, 1)}
                    onCustomPress={() => setScheduleSheetOpen(true)}
                    onEndDatePress={() => enterStep("endDate")}
                    onLeadChange={handleLeadChange}
                    onStartDatePress={() => enterStep("date")}
                    startDate={date}
                />
            ),
            title: t("transaction.field.schedule"),
        };
    };

    const renderStage = (amountText: string, merchant: string) => {
        const amountNumber = numpadToNumber(amountText);
        if (stageStep === "amount") {
            return (
                <TransactionFormAmountPad
                    code={currency}
                    footer={stageFooter(amountNumber, merchant)}
                    forward={stage.forward}
                    label={t("transaction.field.amount")}
                    minorUnits={minorUnits}
                    onChange={(next) => {
                        form.setFieldValue("amount", next);
                        setAmountError(false);
                    }}
                    onCodePress={() => enterStep("currency")}
                    stepKey="amount"
                    value={amountText}
                />
            );
        }
        const { body, footer, rightAction, title } = stageStepContent(amountNumber, merchant);
        return (
            <TransactionStage
                backLabel={t("common.back")}
                footer={
                    footer ??
                    (stageStep === "account" && allAccounts.length === 0 && !installmentsNarrowed
                        ? {
                              label: t("transaction.account.create"),
                              onPress: () => router.push(accountCreateRoute),
                              tone: "primary",
                          }
                        : stageFooter(amountNumber, merchant))
                }
                forward={stage.forward}
                onBack={() => leaveTo(backStepOf(stageStep))}
                rightAction={rightAction}
                stepKey={stageStep}
                title={title}
            >
                {body}
            </TransactionStage>
        );
    };

    const stageFields = (
        <SubscribeFields
            selector={(s) => ({ amount: s.values.amount, merchant: s.values.merchant })}
            store={form.store}
        >
            {({ amount, merchant }) => renderStage(amount, merchant)}
        </SubscribeFields>
    );

    const clearIdentity = () => {
        setIdentitySource("user");
        markTouched("identity");
        setIdentity(EMPTY_DRAFT);
    };

    const tagLabels = tagLabelsOf(tagIdsNow, pendingTagNamesNow);
    const splitLine =
        splitAllocations.length === 0
            ? null
            : t("transaction.sentence.extra.split", {
                  parts: t("transaction.split.count", {
                      count: splitAllocations.length,
                  }),
              });
    const noteLine = noteSummary.length === 0 ? null : t("transaction.sentence.extra.note", { note: noteSummary });
    const rateLine =
        mode === "edit" && converts && rateInForce !== null
            ? t("transaction.sentence.extra.rate", {
                  ...pairUnitSymbols("USD", currency),
                  rate: rateFigure(rateInForce),
              })
            : null;
    const addLabel = (fact: string) => t("transaction.sentence.add.label", { fact });
    const sentenceProps = {
        coach: showCoach ? (
            <Pressable
                accessibilityLabel={t("transaction.sentence.coachDismiss")}
                accessibilityRole="button"
                onPress={dismissCoach}
            >
                <MetaLine
                    qualifier={t("transaction.sentence.coachDismiss")}
                    qualifierIsAction
                    statement={t("transaction.sentence.coach")}
                />
            </Pressable>
        ) : undefined,
        extras: [rateLine, splitLine, noteLine].filter((line) => line !== null),
        onAccountPress: () => enterStep("account"),
        onAmountPress: () => leaveTo("amount"),
        onCategoryPress: () => enterStep("category"),
        onCurrencyPress: () => enterStep("currency"),
        onFeePress: () => enterStep("fee"),
        onKindPress: () => {
            if (rest !== undefined) {
                rest.onWake();
                return;
            }
            handleTypeChange(income ? "expense" : "income");
        },
        onMerchantPress: () => enterStep("merchant"),
        onWhenPress: () => enterStep("when"),
        paidVia: paysBolivares
            ? {
                  blank: t("transaction.sentence.blank.paidVia"),
                  field: t("transaction.paidVia.title"),
                  onPress: () => enterStep("paidVia"),
                  template: t(
                      paidViaNow === "cash" ? "transaction.sentence.paidViaCash" : "transaction.sentence.paidVia"
                  ),
                  value: paidViaNow === null ? null : t(`transaction.paidVia.value.${paidViaNow}`),
              }
            : undefined,
        rest:
            rest === undefined
                ? undefined
                : {
                      addAccessibilityLabel: t("transaction.sentence.add.moreLabel"),
                      addLabel: t("transaction.sentence.add.more"),
                      onWake: rest.onWake,
                  },
        verbs: [
            {
                accessibilityLabel: hasIdentityMark
                    ? t("transaction.sentence.set.icon")
                    : addLabel(t("transaction.sentence.add.icon")),
                active: hasIdentityMark,
                key: "icon",
                label: t("transaction.sentence.add.icon"),
                onPress: openPicker,
                onRemove: clearIdentity,
                removeAccessibilityLabel: t("transaction.identity.hero.removeLogo"),
            },
            {
                accessibilityLabel:
                    tagLabels.length === 0
                        ? addLabel(t("transaction.sentence.add.tags"))
                        : t("transaction.sentence.extra.tags", {
                              tags: tagLabels.join(", "),
                          }),
                active: tagLabels.length > 0,
                key: "tags",
                label: tagLabels.length === 0 ? t("transaction.sentence.add.tags") : namedWithCount(tagLabels),
                onPress: () => {
                    Keyboard.dismiss();
                    tagSheetRef.current?.present();
                },
            },
            {
                accessibilityLabel: splitLine ?? undefined,
                active: splitAllocations.length > 0,
                disabled: !hasAmount,
                key: "split",
                label:
                    splitAllocations.length === 0
                        ? t("transaction.sentence.add.split")
                        : splitLabel(splitAllocations.length),
                onPress: () => {
                    // A sheet presents over the note's keyboard, not under it.
                    Keyboard.dismiss();
                    openSplit(numpadToNumber(form.state.values.amount), category?.id ?? null, minorUnits);
                    splitSheetRef.current?.present();
                },
            },
            {
                accessibilityLabel: isSubscription
                    ? t("transaction.schedule.every", {
                          interval: intervalPhrase(t, recurringType, coefficient),
                      })
                    : undefined,
                active: isSubscription,
                key: "repeat",
                label: isSubscription ? repeatChipLabel() : t("transaction.sentence.add.repeat"),
                onPress: () => enterStep("repeat"),
                onRemove: () => handleKindChange("once"),
                removeAccessibilityLabel: t("transaction.schedule.stopRepeat"),
            },
            {
                accessibilityLabel: noteLine ?? addLabel(t("transaction.sentence.add.note")),
                active: noteOpen || noteSummary.length > 0,
                key: "note",
                label: t("transaction.sentence.add.note"),
                onPress: () => {
                    setNoteOpen((open) => !open);
                    setNoteAsked(true);
                },
            },
            ...(feeable && !feeShown()
                ? [
                      {
                          accessibilityLabel: addLabel(t("transaction.sentence.add.fee")),
                          active: false,
                          key: "fee" as const,
                          label: t("transaction.sentence.add.fee"),
                          onPress: () => enterStep("fee"),
                      },
                  ]
                : []),
            ...installmentOrder.verbs(hasAmount, installmentPrice),
        ],
    } satisfies Partial<ComponentProps<typeof TransactionSentenceBody>>;

    return (
        // Its own PortalProvider: PanelUI's host sits above `LocalDataProvider`, so a sheet portalled there loses the
        // database and `useLocalData` throws.
        <PortalProvider>
            <View
                className="flex-1"
                onLayout={(e) => {
                    containerHeight.set(e.nativeEvent.layout.height);
                }}
            >
                {/* First, so an Android sheet's own header (`cta.android.tsx`) lands above the scroller. */}
                <SubscribeFields
                    selector={(s) => ({
                        amount: s.values.amount,
                        busy: s.isSubmitting,
                        merchant: s.values.merchant,
                    })}
                    store={form.store}
                >
                    {({ amount, busy, merchant }) => (
                        <TransactionFormCta
                            deleteLabel={t("common.delete")}
                            deleteTint={colors.danger}
                            lookupBusy={enriching}
                            lookupLabel={t("transaction.cta.lookup")}
                            onDelete={onDelete}
                            onLookup={mode === "edit" ? lookUpMerchant : undefined}
                            sheet={
                                mode === "edit"
                                    ? { title: resting ? undefined : t("transaction.edit.title") }
                                    : undefined
                            }
                            save={{
                                blockedTint: colors.subtle,
                                busy,
                                label: ctaLabel,
                                onPress: () => pressSubmit(form),
                                ready: entryWhole(numpadToNumber(amount), merchant),
                            }}
                        />
                    )}
                </SubscribeFields>

                <FormScroll
                    blurred={pickerOpen}
                    bottomInset={resting ? 0 : 40}
                    curtainHues={curtainHues}
                    failure={saveFailure}
                    followsStage={largeText}
                    sheet={mode === "edit"}
                >
                    <SubscribeFields
                        selector={(s) => ({ amount: s.values.amount, merchantSeed: s.values.merchantSeed })}
                        store={form.store}
                    >
                        {({ amount, merchantSeed }) => {
                            const amountNumber = numpadToNumber(amount);
                            const feeBaseNow = feeBase(amountNumber);
                            const feeNow = feeAmountFor(amountNumber);
                            return (
                                <FormScrollItem>
                                    <TransactionSentenceBody
                                        {...sentenceProps}
                                        account={account?.name ?? null}
                                        accountTile={accountTile}
                                        amount={
                                            amountNumber <= 0
                                                ? null
                                                : formatAmount(amountNumber, currency, true, language)
                                        }
                                        amountFigure={{ amount: amountNumber, code: currency }}
                                        category={categoryLabel}
                                        categoryFlagged={categoryError}
                                        categoryPending={categoryEnriching}
                                        categoryShake={categoryShake}
                                        categoryTile={categoryTile}
                                        contentWidth={contentWidth}
                                        activeSlot={resting ? null : activeSlot}
                                        onLayout={rest?.onHeight}
                                        feeLine={
                                            feeNow === null || feeBaseNow === null ? undefined : (
                                                <FeeTotal
                                                    account={account?.name ?? null}
                                                    accountTile={accountTile}
                                                    base={feeBaseNow}
                                                    code={feeCurrency}
                                                    fee={feeNow}
                                                    onPress={() => enterStep("fee")}
                                                />
                                            )
                                        }
                                        rate={converts && amountNumber > 0 ? rateClause(amountNumber) : undefined}
                                        amountFlagged={amountError}
                                        amountShake={amountShake}
                                        fee={feeLabel(amountNumber)}
                                        labels={sentenceLabels}
                                        merchant={merchantSeed.length === 0 ? null : merchantSeed}
                                        merchantTile={merchantTile}
                                        when={whenLabel}
                                    />
                                </FormScrollItem>
                            );
                        }}
                    </SubscribeFields>

                    {noteOpen && !resting ? (
                        <FormScrollItem reveal={noteAsked}>
                            <Animated.View entering={revealEntering()} style={{ width: contentWidth }}>
                                <TextInput
                                    accessibilityLabel={t("transaction.field.notes")}
                                    className="text-body text-foreground min-h-24"
                                    defaultValue={notesSeed}
                                    multiline
                                    onChangeText={(next) => {
                                        notesRef.current = next;
                                        setEdited(true);
                                    }}
                                    onEndEditing={() => setNoteSummary(notesRef.current)}
                                    placeholder={t("transaction.field.notesPlaceholder")}
                                    placeholderTextColor={colors.muted}
                                    textAlignVertical="top"
                                />
                            </Animated.View>
                        </FormScrollItem>
                    ) : null}

                    {largeText && !resting ? (
                        <>
                            <FormScrollStageTarget id={stageTarget} key={stageTarget} />
                            <FormScrollItem>
                                <View style={{ width: contentWidth }}>
                                    <StagePartContext value="inline">{stageFields}</StagePartContext>
                                </View>
                            </FormScrollItem>
                        </>
                    ) : null}
                </FormScroll>

                {/* Only the steps with a text field lift over the keyboard; the rest are what it should uncover. */}
                {resting ? null : (
                    <KeyboardAvoidingView
                        behavior="padding"
                        enabled={
                            (stageStep === "merchant" || (stageStep === "account" && installmentsNarrowed)) &&
                            !largeText
                        }
                    >
                        <StagePartContext value="pinned">{stageFields}</StagePartContext>
                    </KeyboardAvoidingView>
                )}

                <SubscribeFields selector={(s) => ({ amount: s.values.amount })} store={form.store}>
                    {({ amount }) => (
                        <>
                            {installmentOrder.sheet(numpadToNumber(amount))}
                            <SplitSheet
                                allocations={splitAllocations}
                                code={currency}
                                db={db}
                                income={income}
                                minorUnits={minorUnitsFor(currency)}
                                onChange={(next) => {
                                    setEdited(true);
                                    setSplitAllocations(next);
                                }}
                                ref={splitSheetRef}
                                total={numpadToNumber(amount)}
                            />
                        </>
                    )}
                </SubscribeFields>
                <SubscribeFields
                    selector={(s) => ({
                        pendingTagNames: s.values.pendingTagNames,
                        tagIds: s.values.tagIds,
                    })}
                    store={form.store}
                >
                    {({ tagIds, pendingTagNames }) => (
                        <TagPickerSheet
                            onCreate={async (createdTagName) => {
                                const id = await tagsRepo.ensureTag(db, createdTagName);
                                if (id) {
                                    setTagsSource("user");
                                    markTouched("tags");
                                    form.setFieldValue("tagIds", [...effectiveTagIdsOf(form.state.values.tagIds), id]);
                                    form.setFieldValue("pendingTagNames", (current) =>
                                        current.filter(
                                            (pendingName) => normalizeTagName(pendingName) !== createdTagName
                                        )
                                    );
                                }
                                return id;
                            }}
                            onToggle={(tagId) => {
                                setTagsSource("user");
                                markTouched("tags");
                                const current = effectiveTagIdsOf(form.state.values.tagIds);
                                form.setFieldValue(
                                    "tagIds",
                                    current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
                                );
                            }}
                            pendingTagNames={pendingTagNames}
                            ref={tagSheetRef}
                            selected={effectiveTagIdsOf(tagIds)}
                            tags={allTags}
                        />
                    )}
                </SubscribeFields>

                <SubscribeFields selector={(s) => ({ date: s.values.date })} store={form.store}>
                    {({ date: firstPaymentDate }) => (
                        <CustomScheduleSheet
                            firstPayment={firstPaymentDate}
                            onDone={startRepeating}
                            onOpenChange={setScheduleSheetOpen}
                            open={scheduleSheetOpen}
                            recurringCoefficient={coefficient}
                            recurringType={recurringType}
                        />
                    )}
                </SubscribeFields>

                <IdentityFlyUpLayer
                    color={identity.color}
                    containerHeight={containerHeight}
                    emoji={identity.emoji}
                    icon={identity.icon}
                    income={income}
                    onDismiss={router.back}
                    photoUri={identity.photoUri}
                    restTop={heroRestTop}
                    variant="transaction"
                />

                <PortalHost />
            </View>
        </PortalProvider>
    );
}

interface FormSeed {
    copyOf?: LogAgainDraft;
    db: Database;
    globalCurrency: string;
    initial?: Transaction;
    nameSeed: string;
    seed?: TransactionSeed;
}

// oxlint-disable-next-line complexity -- the seed has to reconcile initial, copyOf and seed across category, currency and rate in one pass, because `useForm` only reads it once
function initialFormValues({ copyOf, db, globalCurrency, initial, nameSeed, seed }: FormSeed) {
    const sourceId = initial?.categoryId ?? copyOf?.categoryId ?? seed?.categoryId;
    const seedCategory = sourceId ? getCategoryById(db, sourceId) : null;
    const currencySeed = initial?.currency ?? copyOf?.currency ?? seed?.currency ?? null;
    const amountSeed = initial?.amount ?? copyOf?.amount ?? seed?.amount;
    const effectiveCurrency = currencySeed ?? globalCurrency;
    const savedFee = initial ? cardFeeFor(db, initial.id) : null;
    const paidVia = initial && isPaidVia(initial.paidVia) ? initial.paidVia : null;
    const feeFollowsPaidVia =
        initial != null &&
        paidVia !== null &&
        savedFee?.feeRate == null &&
        (savedFee?.amount ?? null) === paidViaCharge(paidVia, initial.amount);
    const feeSeed: FeeDraft | null = initial && !feeFollowsPaidVia ? feeDraftOf(savedFee) : null;
    // SAFETY: fields that start empty carry the type they end up holding, not the empty literal's.
    return {
        account: seedAccount(db, initial, seed),
        amount: amountSeed == null ? "" : numberToNumpad(amountSeed, minorUnitsFor(currencySeed ?? globalCurrency)),
        category: seedCategory,
        coefficient: initial?.recurringCoefficient ?? seed?.recurrence?.coefficient ?? 1,
        date: initial ? new Date(initial.date) : (seed?.date ?? new Date()),
        endDate: initial?.recurringEndDate ? new Date(initial.recurringEndDate) : oneYearFrom(new Date()),
        exchangeRateType: initialEntryRateType(effectiveCurrency, initial?.exchangeRateType),
        fee: feeSeed,
        feeCategoryId: savedFee?.categoryId ?? null,
        hasEndDate: initial?.recurringEndDate != null,
        income: seedCategory?.income ?? initial?.income ?? copyOf?.income ?? seed?.income ?? false,
        // From the live schedule, not `onceRecurring`, which stays true on every back-filled occurrence. Only the row
        // still charging has `recurringType > 0`.
        isSubscription:
            (initial?.recurringType ?? RECURRING_TYPE.none) !== RECURRING_TYPE.none || seed?.recurrence != null,
        leadDays: normalizeLead(initial?.reminderLeadDays ?? null),
        merchant: nameSeed,
        // Seeds the uncontrolled inline field (controlled, the caret would jump); only the stage's merchant step writes
        // it.
        merchantSeed: nameSeed,
        paidVia,
        pendingCategory: null as PendingCategory | null,
        pendingTagNames: [] as readonly string[],
        rateEntry: seededRate(effectiveCurrency, initial?.exchangeRate),
        recurringType:
            initial?.recurringType && initial.recurringType !== RECURRING_TYPE.none
                ? initial.recurringType
                : (seed?.recurrence?.type ?? RECURRING_TYPE.monthly),
        tagIds: [] as string[],
        txCurrency: currencySeed,
    };
}

type TransactionFormValues = ReturnType<typeof initialFormValues>;

function oneYearFrom(date: Date): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1);
    return d;
}
