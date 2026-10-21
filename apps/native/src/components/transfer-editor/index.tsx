import { useRouter } from "expo-router";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { AccessibilityInfo, Keyboard, Pressable, ScrollView, TextInput, View } from "react-native";
import type { LayoutChangeEvent, ScrollViewInstance } from "react-native";

import { AmountNumpad } from "@/components/amount-numpad";
import { InlineFailure } from "@/components/form/inline-failure";
import { Text } from "@/components/text";
import { TransactionFormAmountPad } from "@/components/transaction-form/amount-pad";
import { TransactionFormCta } from "@/components/transaction-form/cta";
import { MetaLine } from "@/components/transaction-form/stage/meta-line";
import { StagePartContext, TransactionStage } from "@/components/transaction-form/stage/stage";
import type { StageFooter } from "@/components/transaction-form/stage/stage";
import { StepAccount } from "@/components/transaction-form/stage/step-account";
import { StepDate } from "@/components/transaction-form/stage/step-date";
import { StepFee } from "@/components/transaction-form/stage/step-fee";
import { StepRate, StepRateField } from "@/components/transaction-form/stage/step-rate";
import { StepWhen } from "@/components/transaction-form/stage/step-when";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { usePeople } from "@/data/accounts";
import { transfersRepo } from "@/data/transfers-core";
import type { SavedTransfer, TransferInput } from "@/data/transfers-core";
import { formatSignedAmount } from "@/domain/account-display";
import { rowAmountLabel } from "@/domain/amount-label";
import { formatSentenceDate } from "@/domain/dates";
import { formatAmount, numberLocale } from "@/domain/money";
import { applyNumpadKey, numpadMode } from "@/domain/numpad";
import type { NumpadKey, NumpadMode } from "@/domain/numpad";
import { rateAge } from "@/domain/rate-age";
import {
    formatRateFigure,
    pairUnitSymbols,
    quotePairRate,
    RATE_ENTRY_DECIMALS,
    rateEntryText,
} from "@/domain/transaction-entry-rate";
import { quotedByBcv, rateNameKey, rateSourceWordKey, transactionWhenLabel } from "@/domain/transaction-form-labels";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useAccountCreateRoute } from "@/hooks/use-pro-gate";
import type { SheetRest } from "@/hooks/use-resting-sheet";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { freshEntries } from "@/lib/fresh-entries";
import { notifySaved } from "@/lib/notify";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

import { blockPrompt, formatRate, gapPrompt, rateDeltaNote } from "./prompts";
import { TransferSentence } from "./transfer-sentence";
import type { TransferSentenceSlot } from "./transfer-sentence";
import { useTransferDraft } from "./use-transfer-draft";
import type { TransferDraftSnapshot, TransferSeed } from "./use-transfer-draft";

type Step = Exclude<TransferSentenceSlot, "feeSide" | "outside"> | "date";

export interface TransferEditorDraft {
    draft: TransferDraftSnapshot;
    note: string;
}

type TransferEditorProps = {
    draftRef?: RefObject<(() => TransferEditorDraft) | null>;
    onDelete?: () => void;
    onDirtyChange?: (dirty: boolean) => void;
    onDone: () => void;
    restore?: TransferEditorDraft;
} & (
    | { rest?: SheetRest; saved: SavedTransfer; seed?: never }
    | { rest?: never; saved?: never; seed?: TransferSeed & { note?: string } }
);

interface TransferNoteProps {
    filled: boolean;
    initial: string;
    onChange: (note: string) => void;
    rest: SheetRest | undefined;
}

function TransferNote({ filled, initial, onChange, rest }: TransferNoteProps) {
    const t = useTranslation();
    const colors = useColors();
    if (rest !== undefined && !filled) {
        return null;
    }
    return (
        <TextInput
            accessibilityLabel={filled ? t("transfers.field.note") : undefined}
            className="text-body text-foreground min-h-12"
            defaultValue={initial}
            multiline
            onChangeText={onChange}
            onFocus={rest?.onWake}
            placeholder={t("transfers.field.note")}
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
        />
    );
}

interface TransferGapProps {
    blocked: boolean;
    crossCurrency: boolean;
    gap: ReturnType<typeof blockPrompt> | ReturnType<typeof gapPrompt>;
    onResolve: (resolve: () => void, hidesArrival: boolean) => () => void;
    resting: boolean;
}

function TransferGap({ blocked, crossCurrency, gap, onResolve, resting }: TransferGapProps) {
    if (!gap) {
        return null;
    }
    return (
        <View className="gap-2">
            <MetaLine statement={gap.message} tone={blocked ? "danger" : "warning"} />
            {resting ? null : (
                <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                    {(
                        [
                            [gap.feeLabel, gap.onFee, false],
                            [gap.outsideLabel, gap.onOutside, false],
                            [gap.topLabel, gap.onTop, !crossCurrency],
                        ] as const
                    ).map(([label, resolve, hidesArrival]) =>
                        label && resolve ? (
                            <Pressable
                                accessibilityRole="button"
                                hitSlop={10}
                                key={label}
                                onPress={onResolve(resolve, hidesArrival)}
                            >
                                <Text className="text-subtitle text-tint font-sans-semibold">{label}</Text>
                            </Pressable>
                        ) : null
                    )}
                </View>
            )}
        </View>
    );
}

function editSurface(editing: boolean, color: string) {
    return editing ? { backgroundColor: color } : undefined;
}

function editSheet(editing: boolean, resting: boolean, title: string) {
    if (!editing) {
        return undefined;
    }
    return { title: resting ? undefined : title };
}

function openingNote(restore?: TransferEditorDraft, saved?: SavedTransfer, seed?: { note?: string }) {
    return restore?.note ?? saved?.note ?? seed?.note ?? "";
}

function useDraftHandoff(
    draftRef: TransferEditorProps["draftRef"],
    read: () => TransferEditorDraft,
    restore: TransferEditorDraft | undefined,
    onDirtyChange: TransferEditorProps["onDirtyChange"]
) {
    const [restored] = useState(restore !== undefined);
    useEffect(() => {
        if (restored) {
            onDirtyChange?.(true);
        }
    }, [onDirtyChange, restored]);
    useLayoutEffect(() => {
        if (draftRef === undefined) {
            return;
        }
        draftRef.current = read;
        return () => {
            draftRef.current = null;
        };
    });
}

function useInlineStageScroll(scrollRef: RefObject<ScrollViewInstance | null>) {
    const stage = useRef({ pending: true, y: 0 });
    const headerHeight = use(HeaderHeightContext) ?? 0;
    const scrollTo = (y: number) => scrollRef.current?.scrollTo({ animated: false, y: y - headerHeight });
    return {
        enter: () => {
            stage.current.pending = true;
            scrollTo(stage.current.y);
        },
        onLayout: (event: LayoutChangeEvent) => {
            const { y } = event.nativeEvent.layout;
            stage.current.y = y;
            if (stage.current.pending) {
                stage.current.pending = false;
                scrollTo(y);
            }
        },
    };
}

export default function TransferEditor({
    draftRef,
    onDelete,
    onDirtyChange,
    onDone,
    rest,
    restore,
    saved,
    seed,
}: TransferEditorProps) {
    const db = useDatabase();
    const router = useRouter();
    const accountCreateRoute = useAccountCreateRoute();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetSurface = useSheetSurface(colors.background);
    const haptics = useHaptics();
    const entryMode = numpadMode(useSettingNumber("numberEntryType"));
    const { use24Hour } = useDisplaySettings().state;
    const draft = useTransferDraft(db, seed, saved, restore?.draft);
    const people = usePeople(db);
    const initialNote = openingNote(restore, saved, seed);
    const noteRef = useRef(initialNote);
    const [noteFilled, setNoteFilled] = useState(initialNote !== "");
    const savingRef = useRef(false);
    const [saving, setSaving] = useState(false);
    const [saveFailure, setSaveFailure] = useState<string | null>(null);
    const [flagged, setFlagged] = useState<TransferSentenceSlot | null>(null);

    const gap = blockPrompt(draft, t, language) ?? gapPrompt(draft, t, language);
    const ledger = [
        { account: draft.from, after: draft.fromBalanceAfter, before: draft.fromBalance },
        { account: draft.to, after: draft.toBalanceAfter, before: draft.toBalance },
    ];
    const [savingLedger, setSavingLedger] = useState<typeof ledger | null>(null);

    const missing = () => {
        if (draft.from === null) {
            return "from";
        }
        if (draft.to === null || draft.to.id === draft.from.id) {
            return "to";
        }
        if (draft.sent <= 0) {
            return "amount";
        }
        if (draft.block?.kind === "rate") {
            return "rate";
        }
        if (draft.block?.kind === "fee") {
            return "fee";
        }
        return draft.gapAmount !== 0 && draft.legs === null ? "arrives" : null;
    };

    const [step, setStep] = useState<Step>(() => missing() ?? "amount");
    const [forward, setForward] = useState(true);
    const [fresh, setFresh] = useState(true);
    const freshRef = useRef(true);
    const saves = draft.canSave && draft.arrivalSeen;
    const largeText = useAccessibilityTextSize();
    const scrollRef = useRef<ScrollViewInstance>(null);
    const stageScroll = useInlineStageScroll(scrollRef);

    const enter = (next: Step, direction = true) => {
        if (next === "arrives") {
            draft.prefillArrival();
        }
        Keyboard.dismiss();
        rest?.onWake();
        setForward(direction);
        freshRef.current = true;
        setFresh(true);
        setStep(next);
        if (largeText) {
            stageScroll.enter();
        }
    };

    const touch = () => onDirtyChange?.(true);
    useDraftHandoff(draftRef, () => ({ draft: draft.snapshot(), note: noteRef.current }), restore, onDirtyChange);

    const typed =
        (pad: { minorUnits: number; mode?: NumpadMode; onChange: (text: string) => void; value: string }) =>
        (text: string, key: NumpadKey) => {
            const trimsEntry = freshRef.current && key === "back";
            freshRef.current = false;
            setFresh(false);
            setFlagged(null);
            touch();
            pad.onChange(trimsEntry ? applyNumpadKey(pad.value, "back", pad.minorUnits, pad.mode ?? entryMode) : text);
        };

    const save = async () => {
        const { from, to, legs, quotedRate, fee, feeSide, crossCurrency, rateType, date } = draft;
        if (!(draft.canSave && from && to && legs && quotedRate) || savingRef.current) {
            return;
        }
        savingRef.current = true;
        setSaving(true);
        setSavingLedger(ledger);
        setSaveFailure(null);
        const storedRateType = rateType === "binance" ? "custom" : rateType;
        const input: TransferInput = {
            date,
            exchangeRate: quotedRate,
            exchangeRateType: crossCurrency ? storedRateType : null,
            fee:
                fee > 0
                    ? {
                          amount: fee,
                          note: t("transfers.fee.note", { from: from.name, to: to.name }),
                          side: feeSide,
                      }
                    : undefined,
            fromAccountId: from.id,
            fromAmount: legs.fromAmount,
            fromCurrency: draft.fromCurrency,
            note: noteRef.current,
            toAccountId: to.id,
            toAmount: legs.toAmount,
            toCurrency: draft.toCurrency,
        };
        const persist = async () => {
            if (saved) {
                await transfersRepo.update(db, saved.id, input);
            } else {
                freshEntries.mark(await transfersRepo.create(db, input));
                notifySaved({
                    actionLabel: t("transfers.saved.another"),
                    amount: {
                        label: rowAmountLabel({ amount: draft.sent, code: draft.fromCurrency, income: null }, t),
                        text: formatAmount(draft.sent, draft.fromCurrency, true, language),
                    },
                    body: t("transfers.saved.from", { from: from.name }),
                    onActionPress: () => router.push("/transactions/transfers/create"),
                    stamp: t("transfers.saved.title"),
                    title: to.name,
                    tone: { ends: { from, to }, kind: "transfer" },
                });
            }
            posthog?.capture("transfer_saved", {
                cross_currency: crossCurrency,
                has_fee: fee > 0,
                mode: saved ? "edit" : "create",
                source: "form",
            });
            haptics("success");
            onDone();
        };
        await persist().catch((error) => {
            console.error("Failed to save the transfer", error);
            haptics("error");
            savingRef.current = false;
            setSaving(false);
            setSavingLedger(null);
            setSaveFailure(t("transfers.save.failed"));
        });
    };

    const onFooter = () => {
        if ((step === "from" || step === "to") && draft.accounts.length === 0) {
            router.push(accountCreateRoute);
            return;
        }
        if (saves) {
            save();
            return;
        }
        if (draft.canSave) {
            enter("arrives");
            return;
        }
        const next = missing() ?? "amount";
        haptics("error");
        setFlagged(next);
        const field = next === "from" || next === "to" ? next : "sent";
        const refusal = next === "rate" || next === "fee" || next === "arrives" ? gap?.message : undefined;
        AccessibilityInfo.announceForAccessibility(
            refusal ?? t("transfers.a11y.missing", { field: t(`transfers.field.${field}`) })
        );
        enter(next);
    };

    const resolveGap = (resolve: () => void, hidesArrival: boolean) => () => {
        touch();
        resolve();
        if (hidesArrival && step === "arrives") {
            enter("amount", false);
        }
    };

    const onSlotPress = (slot: TransferSentenceSlot) => {
        setFlagged(null);
        if (rest !== undefined && (slot === "feeSide" || slot === "outside")) {
            rest.onWake();
            return;
        }
        if (slot === "feeSide") {
            touch();
            draft.toggleFeeSide();
            return;
        }
        if (slot === "outside") {
            touch();
            draft.setOutside(false);
            AccessibilityInfo.announceForAccessibility(
                t("transfers.gap.more", { amount: formatAmount(draft.outside, draft.feeCurrency, true, language) })
            );
            return;
        }
        enter(slot);
    };

    const typingRate = step === "rate" && !fresh;
    const rateUnit = t(
        "transaction.rate.unit",
        pairUnitSymbols(draft.fromCurrency, draft.toCurrency, draft.rateInverse)
    );
    const rateFigure = typingRate
        ? draft.customRatePadText.replace(".", numberLocale(language).decimal) || null
        : formatRate(draft, draft.quotedRate, language);
    const rateLabel = rateFigure === null ? null : `${rateFigure} ${rateUnit}`;
    const feeSideAccount = draft.feeSide === "destination" ? draft.to : draft.from;
    const footer = {
        label: saves ? t("transfers.save") : t("common.next"),
        onPress: onFooter,
        tone: saves && !saving ? "primary" : "muted",
    } as const;
    const back = step === "amount" ? {} : { backLabel: t("common.back"), onBack: () => enter("amount", false) };

    const pads = {
        amount: {
            code: draft.fromCurrency,
            label: t("transfers.field.sent"),
            minorUnits: draft.fromDecimals,
            onChange: draft.setSent,
            value: draft.sentText,
        },
        arrives: {
            code: draft.toCurrency,
            label: t("transfers.field.arrives"),
            minorUnits: draft.toDecimals,
            onChange: draft.setArrived,
            value: draft.arrivedText,
        },
        fee: {
            code: draft.feeCurrency,
            label: t("transfers.field.fee"),
            minorUnits: draft.feeDecimals,
            onChange: draft.setFee,
            value: draft.feeText,
        },
    } as const;
    const ratePad = {
        minorUnits: RATE_ENTRY_DECIMALS,
        mode: "explicitSeparator",
        onChange: (text: string) => {
            draft.setRateType("custom");
            draft.setCustomRate(text);
        },
        value: draft.customRatePadText,
    } as const;

    const chosen = (change: () => void) => () => {
        touch();
        change();
        enter("amount", false);
    };

    const rateReferences = () => {
        const providers = draft.rateOptions.flatMap((type) => {
            const figure = type === "eur_reference" ? null : formatRate(draft, draft.marketRates[type], language);
            return figure === null
                ? []
                : [
                      {
                          figure,
                          label: t(rateNameKey(type, quotedByBcv(draft.fromCurrency, draft.toCurrency))),
                          onPress: chosen(() => draft.setRateType(type)),
                      },
                  ];
        });
        const prior = draft.priorCustomRate;
        if (prior === null) {
            return providers;
        }
        const quoted = quotePairRate(draft.rateInverse, prior.rate);
        return [
            ...providers,
            {
                figure: formatRateFigure(quoted, language),
                label: t("transfers.rate.lastUsed", { date: formatSentenceDate(prior.date, language) }),
                onPress: chosen(() => {
                    draft.setRateType("custom");
                    draft.setCustomRate(rateEntryText(quoted), prior.rate);
                }),
            },
        ];
    };

    const toAmount = () => enter("amount", false);

    const renderStage = () => {
        if (step === "amount" || step === "arrives") {
            const pad = pads[step];
            return (
                <TransactionFormAmountPad
                    {...pad}
                    {...back}
                    footer={footer}
                    forward={forward}
                    onChange={typed(pad)}
                    stepKey={step}
                    value={fresh ? "" : pad.value}
                />
            );
        }
        const body = () => {
            if (step === "from" || step === "to") {
                return (
                    <StepAccount
                        accounts={draft.accounts}
                        allowNone={false}
                        onSelect={(account) => {
                            touch();
                            (step === "from" ? draft.chooseFrom : draft.chooseTo)(account);
                            enter("amount");
                        }}
                        people={people}
                        selectedId={(step === "from" ? draft.from : draft.to)?.id ?? null}
                    />
                );
            }
            if (step === "fee") {
                return (
                    <StepFee
                        field={{
                            comesTo: null,
                            label: t("transfers.field.fee"),
                            placeholder: draft.feeText === "",
                            unit: draft.feeCurrency,
                            value:
                                draft.feeText === "" ? "0" : draft.feeText.replace(".", numberLocale(language).decimal),
                        }}
                        labels={{
                            loggedAs: t("transfers.fee.chargedTo"),
                            total:
                                feeSideAccount === null
                                    ? t("transaction.fee.total")
                                    : t("transaction.fee.pays", { account: feeSideAccount.name }),
                        }}
                        loggedAs={feeSideAccount?.name ?? t("transfers.sentence.blank.account")}
                        onLoggedAsPress={() => {
                            touch();
                            draft.toggleFeeSide();
                        }}
                        onSelect={(mode) => {
                            touch();
                            draft.setFeeMode(mode);
                            if (mode === "none") {
                                enter("amount", false);
                            }
                        }}
                        options={[
                            { id: "none", label: t("transaction.fee.none") },
                            { id: "included", label: t("transfers.fee.included") },
                            { id: "onTop", label: t("transfers.fee.onTop") },
                        ]}
                        selectedId={draft.feeMode}
                        total={
                            draft.feeSide === "source" && draft.sent > 0
                                ? formatAmount(draft.paid, draft.fromCurrency, true, language)
                                : null
                        }
                    >
                        <AmountNumpad
                            code={draft.feeCurrency}
                            minorUnits={draft.feeDecimals}
                            onChange={typed(pads.fee)}
                            showDisplay={false}
                            value={fresh ? "" : pads.fee.value}
                        />
                    </StepFee>
                );
            }
            if (step === "rate") {
                const rateTyped = typingRate && draft.customRatePadText !== "";
                return (
                    <StepRateField
                        error={null}
                        note={rateTyped ? rateDeltaNote(draft, t, language) : null}
                        placeholder={!rateTyped}
                        references={rateReferences()}
                        unit={rateUnit}
                        value={rateFigure ?? t("transaction.rate.type")}
                    >
                        <AmountNumpad
                            code={draft.toCurrency}
                            minorUnits={ratePad.minorUnits}
                            mode={ratePad.mode}
                            onChange={typed(ratePad)}
                            showDisplay={false}
                            value={fresh ? "" : ratePad.value}
                        />
                    </StepRateField>
                );
            }
            if (step === "rateType") {
                return (
                    <StepRate
                        onSelect={(next) => {
                            touch();
                            const prior = draft.priorCustomRate;
                            if (next === "custom" && draft.rateType !== "custom" && prior !== null) {
                                draft.setCustomRate(
                                    rateEntryText(quotePairRate(draft.rateInverse, prior.rate)),
                                    prior.rate
                                );
                            }
                            draft.setRateType(next);
                            enter(next === "custom" ? "rate" : "amount");
                        }}
                        options={draft.rateOptions.map((type) => {
                            const shared = {
                                name: t(rateNameKey(type, quotedByBcv(draft.fromCurrency, draft.toCurrency))),
                                type,
                                unit: rateUnit,
                            };
                            if (type === "custom") {
                                const prior = draft.priorCustomRate;
                                return {
                                    ...shared,
                                    detail:
                                        prior === null
                                            ? t("transaction.rate.typeHint")
                                            : t("transaction.rate.lastUsed", {
                                                  date: formatSentenceDate(prior.date, language),
                                                  rate: formatRateFigure(
                                                      quotePairRate(draft.rateInverse, prior.rate),
                                                      language
                                                  ),
                                              }),
                                    figure:
                                        draft.rateType === "custom"
                                            ? formatRate(draft, draft.quotedRate, language)
                                            : null,
                                    placeholder: t("transaction.rate.type"),
                                };
                            }
                            const source = draft.rateSources[type];
                            return {
                                ...shared,
                                ...rateAge(t, {
                                    entryDate: draft.date,
                                    fetchedAt: source?.fetchedAt ?? null,
                                    language,
                                    now: new Date(),
                                    rateDate: source?.date ?? null,
                                    use24Hour,
                                }),
                                figure: formatRate(draft, draft.marketRates[type], language),
                                placeholder: t("transaction.rate.unavailable"),
                            };
                        })}
                        selected={draft.rateType}
                    />
                );
            }
            if (step === "when") {
                return (
                    <StepWhen
                        date={draft.date}
                        now={new Date()}
                        onPick={() => enter("date")}
                        onSelect={(next) => {
                            touch();
                            draft.setDate(next);
                            enter("amount");
                        }}
                        pickLabel={t("transaction.sentence.when.pick")}
                    />
                );
            }
            return (
                <StepDate
                    date={draft.date}
                    onChange={(next) => {
                        touch();
                        draft.setDate(next);
                    }}
                />
            );
        };
        const titles = {
            date: t("transfers.field.date"),
            fee: t("transfers.field.fee"),
            from: t("transfers.field.from"),
            rate: t("transaction.rate.custom"),
            rateType: t("transaction.rate.title"),
            to: t("transfers.field.to"),
            when: t("transfers.field.date"),
        } as const;
        const stageFooter = (): StageFooter => {
            if (step === "rateType") {
                return { label: t("common.done"), onPress: toAmount, tone: "primary" };
            }
            const used = step === "rate" ? formatRate(draft, draft.quotedRate, language) : null;
            return used === null
                ? footer
                : { label: t("transaction.rate.use", { value: used }), onPress: toAmount, tone: "primary" };
        };
        return (
            <TransactionStage
                backLabel={t("common.back")}
                footer={stageFooter()}
                forward={forward}
                onBack={toAmount}
                stepKey={step}
                title={titles[step]}
            >
                {body()}
            </TransactionStage>
        );
    };

    const resting = rest !== undefined;
    const activeSlot = step === "date" ? "when" : step;

    return (
        <View
            className="bg-background flex-1"
            collapsable={false}
            // On Android an edit sheet is the M3 sheet surface; the screen background would show as a second colour.
            style={editSurface(saved !== undefined, sheetSurface)}
        >
            {/* First, so an Android edit sheet's own header (`cta.android.tsx`) lands above the scroller. */}
            <TransactionFormCta
                deleteLabel={t("transfers.delete.row")}
                deleteTint={colors.danger}
                onDelete={onDelete}
                sheet={editSheet(saved !== undefined, resting, t("transfers.title"))}
                save={{
                    blockedTint: colors.subtle,
                    busy: saving,
                    label: t("transfers.save"),
                    onPress: onFooter,
                    ready: saves,
                }}
            />
            {/* react-native-screens resizes a ScrollView on a formSheet's first-child chain to the whole sheet. */}
            <View collapsable={false} />
            <View className="flex-1">
                <ScrollView
                    contentContainerClassName={cn("gap-4 px-5 pt-2", resting ? null : "pb-10")}
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={(_width, height) => rest?.onHeight(height)}
                    ref={scrollRef}
                >
                    <TransferSentence
                        activeSlot={resting ? null : activeSlot}
                        crossCurrency={draft.crossCurrency}
                        customRate={draft.rateType === "custom"}
                        figures={{
                            amount: { amount: draft.sent, code: draft.fromCurrency },
                            arrives:
                                draft.arrived === null ? undefined : { amount: draft.arrived, code: draft.toCurrency },
                            fee: { amount: draft.fee, code: draft.feeCurrency },
                            outside: { amount: draft.outside, code: draft.feeCurrency },
                        }}
                        flaggedSlot={flagged}
                        hasFee={draft.fee > 0}
                        onSlotPress={onSlotPress}
                        onTop={draft.feeMode === "onTop"}
                        outside={draft.outside > 0}
                        values={{
                            amount:
                                draft.sent > 0 ? formatAmount(draft.sent, draft.fromCurrency, true, language) : null,
                            arrives:
                                draft.arrived !== null && draft.arrived > 0
                                    ? formatAmount(draft.arrived, draft.toCurrency, true, language)
                                    : null,
                            fee: draft.fee > 0 ? formatAmount(draft.fee, draft.feeCurrency, true, language) : null,
                            feeSide: feeSideAccount?.name ?? null,
                            from: draft.from?.name ?? null,
                            outside:
                                draft.outside > 0
                                    ? formatAmount(draft.outside, draft.feeCurrency, true, language)
                                    : null,
                            rate: rateLabel,
                            rateType: t(
                                rateSourceWordKey(draft.rateType, quotedByBcv(draft.fromCurrency, draft.toCurrency))
                            ),
                            to: draft.to?.name ?? null,
                            when: transactionWhenLabel(t, {
                                date: draft.date,
                                interval: null,
                                language,
                                now: new Date(),
                            }),
                        }}
                    />

                    <TransferGap
                        blocked={draft.block !== null}
                        crossCurrency={draft.crossCurrency}
                        gap={gap}
                        onResolve={resolveGap}
                        resting={resting}
                    />

                    {resting ? null : (
                        <View className="border-separator border-t">
                            {(savingLedger ?? ledger).map(({ account, after, before }) => {
                                if (account === null) {
                                    return null;
                                }
                                const balance = formatSignedAmount(before, account.currency, true, language);
                                const next =
                                    draft.legs === null || after === before
                                        ? null
                                        : formatSignedAmount(after, account.currency, true, language);
                                return (
                                    <View
                                        accessibilityLabel={
                                            next === null
                                                ? t("transfers.a11y.balance", { account: account.name, balance })
                                                : t("transfers.a11y.balanceChange", {
                                                      account: account.name,
                                                      after: next,
                                                      before: balance,
                                                  })
                                        }
                                        accessible
                                        className="border-separator flex-row justify-between gap-3 border-b py-2.5"
                                        key={account.id}
                                    >
                                        <Text className="text-label text-muted font-mono">{account.name}</Text>
                                        <Text className="text-label text-foreground shrink text-right font-mono">
                                            {next === null ? balance : `${balance} → ${next}`}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <TransferNote
                        filled={noteFilled}
                        initial={initialNote}
                        onChange={(next) => {
                            noteRef.current = next;
                            setNoteFilled(next !== "");
                            touch();
                        }}
                        rest={rest}
                    />

                    {largeText && !resting ? (
                        <View onLayout={stageScroll.onLayout}>
                            <StagePartContext value="inline">{renderStage()}</StagePartContext>
                        </View>
                    ) : null}
                </ScrollView>
            </View>

            <View className="px-5">
                <InlineFailure message={saveFailure} />
            </View>
            {resting ? null : <StagePartContext value="pinned">{renderStage()}</StagePartContext>}
        </View>
    );
}
