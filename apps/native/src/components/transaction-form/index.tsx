import { toAccountKind } from "@outlayr/money/account-kind";
import { useField, useForm, useSelector } from "@tanstack/react-form";
import type * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRouter } from "expo-router";
import { PortalHost, PortalProvider } from "panelui-native/primitives/portal";
import type { ComponentProps, RefObject } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Pressable, View, useWindowDimensions } from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { shallowEqual } from "@/components/form/shallow-equal";
import { holdSubmitting, pressSubmit } from "@/components/form/submit-guard";
import { SubscribeFields } from "@/components/form/subscribe-fields";
import type { IdentitySelection } from "@/components/identity-picker-shared";
import { ReceiptLines } from "@/components/receipt/receipt-lines";
import { useAppSettings, useSettingBool } from "@/contexts/display-settings-context";
import { useBankAccounts, usePeople } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import type { AttachmentDraft } from "@/data/attachments-core";
import { useCategoriesByNamespace } from "@/data/categories";
import type { Category } from "@/data/categories-core";
import { useFavouriteCurrencies } from "@/data/favourite-currencies";
import { useRecentMerchants } from "@/data/merchant-history";
import { useTagIdsFor, useTags } from "@/data/tags";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { rowAmountLabel } from "@/domain/amount-label";
import { computeCurtainHues } from "@/domain/curtain-hues";
import { suggestMerchants } from "@/domain/merchant-suggest";
import { formatAmount, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { parseReceipt } from "@/domain/receipt-items";
import type { Allocation } from "@/domain/split";
import { isRealSplit } from "@/domain/split-draft";
import type { LogAgainDraft } from "@/domain/transaction-actions";
import { ctaKey, transactionWhenLabel } from "@/domain/transaction-form-labels";
import { transactionFormErrors } from "@/domain/transaction-form-validate";
import { resolveTransactionIdentity } from "@/domain/transaction-identity";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useCreateAccount } from "@/hooks/use-pro-gate";
import type { SheetRest } from "@/hooks/use-resting-sheet";
import { useToggleFavouriteCurrency } from "@/hooks/use-toggle-favourite-currency";
import type { PendingCategory } from "@/hooks/use-transaction-enrichment";
import { useLanguage, useTranslation } from "@/i18n/context";
import { celebration } from "@/lib/celebration";
import { notifyFailure, notifySaved } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";
import { glowFromEmoji } from "@/theme/glow";
import { useColors } from "@/theme/use-colors";

import { AccountTile } from "../account-tile";
import { CategoryIcon } from "../category-icon";
import { IdentityFlyUpLayer } from "../identity-fly-up";
import { ThinkingOrb } from "../thinking-orb/thinking-orb";
import { TransactionFormAmountPad } from "./amount-pad";
import { AttachmentStrip } from "./attachment-strip";
import { TransactionFormCta } from "./cta";
import { saveEntry } from "./entry-flows";
import { entryRateOf } from "./entry-rate";
import { FormScroll, FormScrollItem, FormScrollStageTarget } from "./form-scroll";
import { initialFormValues } from "./form-values";
import type { TransactionFormValues, TransactionSeed } from "./form-values";
import type { LookupSources } from "./merchant-lookup";
import { TransactionSentenceBody } from "./sentence/sentence-body";
import { sentenceLabelsOf } from "./sentence/sentence-labels";
import { MetaLine } from "./stage/meta-line";
import { StagePartContext, TransactionStage } from "./stage/stage";
import type { StageFooter } from "./stage/stage";
import { advanceFrom, backStepOf, entryWhole, footerPlan, STEP_SLOTS } from "./stage/stage-steps";
import type { GuidedAnswers, StageNavigation, StagePosition, StageStep, StageStepContent } from "./stage/stage-steps";
import { StepAccount } from "./stage/step-account";
import { StepAccountInstallments } from "./stage/step-account-installments";
import { StepCategory } from "./stage/step-category";
import { StepCurrency } from "./stage/step-currency";
import { StepDate } from "./stage/step-date";
import { StepMerchant } from "./stage/step-merchant";
import { StepWhen } from "./stage/step-when";
import { useAttachmentDraft } from "./use-attachment-draft";
import { useCardFee } from "./use-card-fee";
import { useEntryIdentity } from "./use-entry-identity";
import { useEntryNote } from "./use-entry-note";
import { useEntryRate } from "./use-entry-rate";
import { useEntrySchedule } from "./use-entry-schedule";
import { useEntryTags } from "./use-entry-tags";
import { useInstallmentOrder } from "./use-installment-order";
import { useMerchantLookup } from "./use-merchant-lookup";
import { useMissingFlags } from "./use-missing-flags";
import { useSplitDraft } from "./use-split-draft";

const HERO_REST_TOP = 88;

// A stage body has no intrinsic height and an auto-sized list measures zero while the stage swaps, so the list needs
// a size from the first frame. A window fraction, since the sentence still sits above.
const CURRENCY_LIST_FRACTION = 0.34;

const MERCHANT_SUGGESTION_LIMIT = 4;
const RECEIPT_VISIBLE_LINES = 8;

export interface TransactionFormDraft extends LookupSources {
    accountDeclined: boolean;
    attachments: AttachmentDraft[];
    identity: IdentitySelection;
    notes: string;
    splitAllocations: Allocation[];
    values: TransactionFormValues;
}

interface TransactionFormShared {
    db: Database;
    onDelete?: () => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDone: () => void;
    draftRef?: RefObject<(() => TransactionFormDraft) | null>;
    rest?: SheetRest;
    restore?: TransactionFormDraft;
}

type TransactionFormProps = TransactionFormShared &
    (
        | {
              copyOf?: LogAgainDraft;
              mode: "create";
              seed?: TransactionSeed;
          }
        | { initial: Transaction; mode: "edit" }
    );

function entrySources(props: TransactionFormProps) {
    return props.mode === "edit"
        ? { copyOf: undefined, initial: props.initial, seed: undefined }
        : { copyOf: props.copyOf, initial: undefined, seed: props.seed };
}

export function TransactionForm(props: TransactionFormProps) {
    const { db, draftRef, mode, onDelete, onDirtyChange, onDone, rest, restore } = props;
    const { copyOf, initial, seed } = entrySources(props);
    const resting = rest !== undefined;
    const colors = useColors();
    const haptics = useHaptics();
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const t = useTranslation();
    const { language } = useLanguage();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    // Swift's `.padding(.horizontal, 20)` content box.
    const contentWidth = windowWidth - 40;
    const currencyListHeight = Math.round(windowHeight * CURRENCY_LIST_FRACTION);
    const globalCurrency = useGlobalCurrency(db);

    const [nameSeed] = useState(() => initial?.note ?? copyOf?.note ?? seed?.note ?? "");
    const [notesSeed] = useState(() => restore?.notes ?? initial?.details ?? copyOf?.details ?? seed?.details ?? "");
    const [storedReceipt] = useState(() => parseReceipt(initial?.receipt));
    const [saveFailure, setSaveFailure] = useState<string | null>(null);

    // Frozen at mount: `useForm` re-applies changed `defaultValues` while untouched, and `date`/`endDate` are
    // `new Date()` here, so an inline object would re-seed both to now every render.
    const [initialValues] = useState(
        () => restore?.values ?? initialFormValues({ copyOf, db, globalCurrency, initial, nameSeed, seed })
    );

    const formErrorsOf = (value: TransactionFormValues) =>
        transactionFormErrors({
            ...value,
            categoryDeferred: lookup.queueable(value.merchant),
            currency: value.txCurrency ?? globalCurrency,
            exchangeRate: entryRateOf(value.rateEntry, value.txCurrency ?? globalCurrency),
        });

    const submitEntry = (value: TransactionFormValues): Effect.Effect<boolean> | null => {
        setSaveFailure(null);

        const entryCurrency = value.txCurrency ?? globalCurrency;
        const amount = roundToMinorUnits(numpadToNumber(value.amount), entryCurrency);
        const refusal = split.refusal(amount, entryCurrency) ?? installmentOrder.problem(amount);
        if (refusal !== null) {
            haptics("error");
            setSaveFailure(refusal);
            return null;
        }

        return saveEntry({
            commit: {
                attachments,
                carry: (savedId) => lookup.carry(savedId, value, entryCurrency),
                db,
                draft: {
                    accountId: value.account?.id ?? null,
                    // Rounded to the currency's units at save: switching currency mid-entry leaves the typed digits
                    // alone, so 12.34 typed in USD would show as ¥12 while the row kept 12.34.
                    amount,
                    categoryId: value.category?.id ?? null,
                    currency: value.txCurrency,
                    customColor: identity.color,
                    date: value.date,
                    details: note.read(),
                    emoji: identity.emoji,
                    exchangeRate: value.exchangeRateType == null ? null : entryRateOf(value.rateEntry, entryCurrency),
                    exchangeRateType: value.exchangeRateType,
                    fee: (categoryId) =>
                        cardFee.input(value.merchant.trim() || (value.category?.name ?? ""), categoryId, amount),
                    icon: identity.icon,
                    imageColor: identity.photoColor,
                    imageUri: identity.photoUri,
                    income: value.income,
                    merchant: value.merchant,
                    paidVia: cardFee.savedPaidVia(value.paidVia),
                    receipt: seed?.receipt,
                    schedule: value.isSubscription
                        ? {
                              coefficient: value.coefficient,
                              endDate: value.hasEndDate ? value.endDate : null,
                              leadDays: value.leadDays,
                              type: value.recurringType,
                          }
                        : null,
                },
                initial,
                installments: (entry, writeExtras) => installmentOrder.save(entry, amount, writeExtras),
                pendingCategory:
                    value.category || !value.pendingCategory
                        ? undefined
                        : { siblings: categoriesForNamespace, value: value.pendingCategory },
                source: "form",
                splits: {
                    allocations: isRealSplit(split.allocations) ? split.allocations : [],
                    decimals: minorUnitsFor(entryCurrency),
                },
                tags: tags.commitOf(value),
            },
            onMissingCategory: () => flags.flag("category"),
            onSaveFailed: () => {
                // Say so: un-dimming the CTA in silence reads as a missed tap. Pinned under the header, since a toast
                // would sit under this sheet and the footer must stay pressable.
                haptics("error");
                setSaveFailure(t("transaction.save.failedBody"));
            },
            onSaved: () => {
                haptics("success");
                if (mode === "create") {
                    announceSaved(value, amount);
                }
                onDone();
                return mode === "create" && !installmentOrder.afterDone();
            },
            onScheduleFailed: () => {
                haptics("error");
                // Raised before the dismissal: the root toast outlives this route, while an alert's presenter is gone
                // once the modal tears down.
                notifyFailure({
                    body: t("transaction.save.scheduleFailedBody"),
                    title: t("transaction.save.scheduleFailedTitle"),
                });
                onDone();
            },
        });
    };

    const form = useForm({
        defaultValues: initialValues,
        listeners: {
            onChange: ({ formApi, fieldApi }) => {
                if (fieldApi.name !== "income") {
                    return;
                }
                formApi.setFieldValue("category", null);
                formApi.setFieldValue("pendingCategory", null);
                lookup.releaseCategory();
            },
        },
        onSubmit: ({ value }) => {
            const submitting = submitEntry(value);
            if (submitting === null) {
                return;
            }
            return runFlow(submitting).then((result) =>
                AsyncResult.isSuccess(result) && result.value === true ? holdSubmitting() : undefined
            );
        },
        // The footer is never disabled, so a tap with no category lands here.
        onSubmitInvalid: ({ value }) => {
            const fields = formErrorsOf(value)?.fields ?? {};
            if (fields.amount !== undefined) {
                flags.flag("amount");
            }
            if (fields.category !== undefined) {
                flags.flag("category", fields.amount === undefined);
            }
            if (fields.exchangeRate !== undefined) {
                rate.flagMissing(fields.amount === undefined && fields.category === undefined);
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

    // Registers a FieldApi so `listeners` fire: `setFieldValue` dispatches through the mounted field, so without it the
    // cascade is a silent no-op.
    useField({ form, name: "income" });

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
    const navigation: StageNavigation = { enter: enterStep, leave: leaveTo, step: stageStep };

    const flags = useMissingFlags();
    const rate = useEntryRate({
        currency,
        date,
        db,
        exchangeRateType,
        flagRate: (announce) => flags.flag("rate", announce),
        form,
        initial,
        mode,
        rateEntry,
        rateShake: flags.rateShake,
        stage: navigation,
    });

    const categoriesForNamespace = useCategoriesByNamespace(db, income);
    const allAccounts = useBankAccounts(db);
    const people = usePeople(db);
    const recentNames = useRecentMerchants(db, income);
    const allTags = useTags(db);
    const savedTagIds = useTagIdsFor(db, initial?.id ?? null);
    const lookup = useMerchantLookup({
        allTags,
        categories: categoriesForNamespace,
        categoryChosen: initialValues.category !== null,
        currency,
        db,
        form,
        globalCurrency,
        income,
        nameSeed,
        onCategoryFilled: () => flags.clear("category"),
        restored: restore,
        savedTagIds,
    });
    const { identitySource, tagsSource } = lookup.sources;
    const {
        identity,
        pickerOpen,
        tile: merchantTile,
        verb: iconVerb,
    } = useEntryIdentity({
        claim: lookup.claim,
        copyOf,
        initial,
        restored: restore,
        source: identitySource,
    });
    const tags = useEntryTags({
        allTags,
        claim: lookup.claim,
        db,
        form,
        pendingTagNames: pendingTagNamesNow,
        savedTagIds,
        source: tagsSource,
        tagIds: tagIdsNow,
    });

    const accountTile = account ? <AccountTile account={account} size={20} /> : undefined;
    const cardFee = useCardFee({
        account,
        accountTile,
        amountInUsd: rate.amountInUsd,
        categories: categoriesForNamespace,
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
        stage: navigation,
    });
    const schedule = useEntrySchedule({
        coefficient,
        date,
        db,
        endDate,
        form,
        hasEndDate,
        isSubscription,
        leadDays,
        recurringType,
        stage: navigation,
    });

    const favouriteCurrencies = useFavouriteCurrencies(db);
    const toggleFavourite = useToggleFavouriteCurrency(db);
    const selectCategory = (picked: Category) => {
        form.setFieldValue("category", picked);
        form.setFieldValue("pendingCategory", null);
        lookup.claim("category");
        flags.clear("category");
    };
    const [edited, setEdited] = useState(restore !== undefined);
    const split = useSplitDraft({
        categoryId: category?.id ?? null,
        currency,
        db,
        hasAmount,
        income,
        initial,
        mode,
        onEdit: () => setEdited(true),
        readAmount: () => numpadToNumber(form.state.values.amount),
        restored: restore?.splitAllocations,
    });
    const installmentsNarrowed = seed?.installments === true && !income;
    const installmentOrder = useInstallmentOrder({
        account,
        banks: allAccounts,
        currency,
        date,
        db,
        entryRate: { rate: rate.inForce, type: rate.selection.exchangeRateType },
        hasPrice: hasAmount,
        income,
        initial,
        intent: seed?.installments === true,
        isSubscription,
        mode,
        seeded: seed?.installmentDraft,
        turn: stageTurn,
    });
    const installmentPrice = useSelector(form.store, (s) =>
        installmentOrder.drafting ? numpadToNumber(s.values.amount) : 0
    );
    const [accountDeclined, setAccountDeclined] = useState(
        () => restore?.accountDeclined ?? (initial != null && initial.accountId == null)
    );
    const liabilities = allAccounts.filter((candidate) => toAccountKind(candidate.kind) === "liability");

    const celebrate = useAppSettings().state.bool("confetti");
    const router = useRouter();
    const createAccount = useCreateAccount();
    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HERO_REST_TOP);
    const announceSaved = (value: TransactionFormValues, amount: number) => {
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

    const lookUpMerchant = () => {
        rest?.onWake();
        haptics("light");
        lookup.lookUp();
    };

    const handleTypeChange = (next: "expense" | "income") => {
        const nextIncome = next === "income";
        if (nextIncome !== income) {
            form.setFieldValue("income", nextIncome);
        }
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

    const formDirty = useSelector(form.store, (state) => state.isDirty);
    const attachmentDraft = useAttachmentDraft({
        db,
        initial,
        mode,
        onEdit: () => setEdited(true),
        onFailure: (message) => {
            haptics("error");
            setSaveFailure(message);
        },
        restored: restore?.attachments,
        seeded: seed?.attachment,
    });
    const { attachments } = attachmentDraft;
    const dirty = formDirty || edited || identitySource === "user";
    // oxlint-disable-next-line outlayr/react-effect-budget -- reports the form's dirtiness to the screen's navigation guard that blocks leaving with edits
    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const note = useEntryNote({
        contentWidth,
        hidden: resting,
        onEdit: () => setEdited(true),
        seeded: notesSeed,
    });

    // oxlint-disable-next-line outlayr/react-effect-budget -- hands the draft reader to the sheet's swipe-dismiss listener while mounted, and clears it on unmount
    useLayoutEffect(() => {
        if (draftRef === undefined) {
            return;
        }
        draftRef.current = () => ({
            ...lookup.sources,
            accountDeclined,
            attachments,
            identity,
            notes: note.read(),
            splitAllocations: split.allocations,
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

    const categorySlot = categorySlotOf({ category, pendingCategory, searching: lookup.categoryPending }, colors);

    const answersFor = (amountNumber: number, merchant: string): GuidedAnswers => ({
        account:
            account != null ||
            accountDeclined ||
            (allAccounts.length === 0 && !seed?.accountUnresolved && !installmentsNarrowed),
        amount: amountNumber > 0,
        category: categorySlot.label !== null || lookup.queueable(merchant),
        merchant: merchant.trim() !== "",
    });

    const advance = (step: StageStep, amountNumber: number, merchant: string) => {
        const next = advanceFrom(answersFor(amountNumber, merchant), step);
        goStage(next, next !== "amount");
    };

    const stageFooter = (amountNumber: number, merchant: string): StageFooter => {
        const { onward, saves } = footerPlan(answersFor(amountNumber, merchant), stageStep);
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

    // `merchantSeed` is left alone: re-seeding that field mid-keystroke would take the caret with it.
    const handleMerchantChange = (next: string) => {
        form.setFieldValue("merchant", next);
        lookup.onMerchantChange(next);
    };

    // The sentence's field is uncontrolled, so moving it means re-seeding it.
    const handleStageMerchantChange = (next: string) => {
        form.setFieldValue("merchantSeed", next);
        handleMerchantChange(next);
    };

    const whenLabel = transactionWhenLabel(t, {
        date,
        interval: schedule.interval,
        language,
        now: new Date(),
    });

    const moduleSteps = { ...cardFee.steps, ...rate.steps, ...schedule.steps };

    const pickAccount = (picked: Account | null, amountNumber: number, merchant: string) => {
        form.setFieldValue("account", picked);
        setAccountDeclined(picked === null);
        advance("account", amountNumber, merchant);
    };

    const accountStep = (amountNumber: number, merchant: string): StageStepContent => {
        const apps = income ? null : (
            <StepAccountInstallments
                accounts={allAccounts}
                onPick={(picked) => pickAccount(picked, amountNumber, merchant)}
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
                        onSelect={(picked) => pickAccount(picked, amountNumber, merchant)}
                        people={installmentsNarrowed ? undefined : people}
                        selectedId={account?.id ?? null}
                    />
                ),
            title: t("transaction.field.account"),
        };
    };

    const stageStepContent = (
        step: Exclude<StageStep, "amount">,
        amountNumber: number,
        merchant: string
    ): StageStepContent => {
        switch (step) {
            case "account": {
                return accountStep(amountNumber, merchant);
            }
            case "category": {
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
            case "currency": {
                return {
                    body: (
                        <StepCurrency
                            favourites={favouriteCurrencies}
                            listMinHeight={currencyListHeight}
                            onSelect={(next) => {
                                rate.handleCurrencyChange(next);
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
            case "date": {
                return {
                    body: <StepDate date={date} onChange={rate.handleDateChange} withTime />,
                    title: t("transaction.field.date"),
                };
            }
            case "merchant": {
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
            case "when": {
                return {
                    body: (
                        <StepWhen
                            date={date}
                            now={new Date()}
                            onPick={() => enterStep("date")}
                            onSelect={(next) => {
                                rate.handleDateChange(next);
                                advance("when", amountNumber, merchant);
                            }}
                            pickLabel={t("transaction.sentence.when.pick")}
                        />
                    ),
                    title: t("transaction.field.date"),
                };
            }
            default: {
                return moduleSteps[step](amountNumber);
            }
        }
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
                        flags.clear("amount");
                    }}
                    onCodePress={() => enterStep("currency")}
                    stepKey="amount"
                    value={amountText}
                />
            );
        }
        const { body, footer, rightAction, title } = stageStepContent(stageStep, amountNumber, merchant);
        return (
            <TransactionStage
                backLabel={t("common.back")}
                footer={
                    footer ??
                    (stageStep === "account" && allAccounts.length === 0 && !installmentsNarrowed
                        ? {
                              label: t("transaction.account.create"),
                              onPress: createAccount,
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
        extras: [rate.line, split.line, note.line].filter((line) => line !== null),
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
        paidVia: cardFee.paidVia,
        rest:
            rest === undefined
                ? undefined
                : {
                      addAccessibilityLabel: t("transaction.sentence.add.moreLabel"),
                      addLabel: t("transaction.sentence.add.more"),
                      onWake: rest.onWake,
                  },
        verbs: [
            iconVerb,
            tags.verb,
            split.verb,
            schedule.verb,
            note.verb,
            attachmentDraft.verb,
            ...cardFee.verbs,
            ...installmentOrder.verbs(hasAmount, installmentPrice),
        ],
    } satisfies Partial<ComponentProps<typeof TransactionSentenceBody>>;

    return (
        // Its own PortalProvider: PanelUI's host sits above `LanguageProvider`, so a sheet portalled there loses it and
        // `useTranslation` throws.
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
                            lookupBusy={lookup.pending}
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
                                ready: entryWhole(answersFor(numpadToNumber(amount), merchant)),
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
                                        category={categorySlot.label}
                                        categoryFlagged={flags.category.flagged}
                                        categoryPending={lookup.categoryPending}
                                        categoryShake={flags.category.shake}
                                        categoryTile={categorySlot.tile}
                                        contentWidth={contentWidth}
                                        activeSlot={resting ? null : STEP_SLOTS[stageStep]}
                                        onLayout={rest?.onHeight}
                                        feeLine={cardFee.line(amountNumber)}
                                        rate={rate.clause(amountNumber)}
                                        amountFlagged={flags.amount.flagged}
                                        amountShake={flags.amount.shake}
                                        fee={cardFee.label(amountNumber)}
                                        labels={sentenceLabelsOf(t, {
                                            accountDeclined,
                                            currency,
                                            feeTitle: cardFee.title,
                                            income,
                                            language,
                                        })}
                                        merchant={merchantSeed.length === 0 ? null : merchantSeed}
                                        merchantTile={merchantTile}
                                        when={whenLabel}
                                    />
                                </FormScrollItem>
                            );
                        }}
                    </SubscribeFields>

                    {attachments.length > 0 && !resting ? (
                        <FormScrollItem>
                            <View style={{ width: contentWidth }}>
                                <AttachmentStrip
                                    attachments={attachments}
                                    menu={attachmentDraft.menu}
                                    onPreview={attachmentDraft.preview}
                                    onRemove={attachmentDraft.remove}
                                />
                            </View>
                        </FormScrollItem>
                    ) : null}

                    {storedReceipt !== null && initial && !resting ? (
                        <FormScrollItem>
                            <View style={{ width: contentWidth }}>
                                <ReceiptLines
                                    {...storedReceipt}
                                    currency={initial.currency ?? globalCurrency}
                                    total={initial.amount}
                                    visibleLines={RECEIPT_VISIBLE_LINES}
                                />
                            </View>
                        </FormScrollItem>
                    ) : null}

                    {note.item}

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
                            {split.sheet(numpadToNumber(amount))}
                        </>
                    )}
                </SubscribeFields>
                {tags.sheet}

                {schedule.sheet}

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

function categorySlotOf(
    {
        category,
        pendingCategory,
        searching,
    }: { category: Category | null; pendingCategory: PendingCategory | null; searching: boolean },
    colors: ReturnType<typeof useColors>
) {
    const label = category?.name ?? pendingCategory?.name ?? null;
    if (searching) {
        return { label, tile: <ThinkingOrb state="searching" /> };
    }
    if (!category && !pendingCategory) {
        return { label, tile: undefined };
    }
    const chosenCategoryTint = category?.income ? colors.income : (category?.color ?? colors.foreground);
    const categoryGlyphTint = category ? chosenCategoryTint : (pendingCategory?.color ?? colors.muted);
    return {
        label,
        tile: (
            <CategoryIcon color={categoryGlyphTint} name={category ? category.icon : pendingCategory?.icon} size={20} />
        ),
    };
}
