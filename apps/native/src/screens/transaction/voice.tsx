import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Shimmer } from "panelui-native/components/shimmer";
import { use, useEffect, useState } from "react";
import type React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useDerivedValue,
    useReducedMotion,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiConsentGate } from "@/components/ai-consent";
import { AmountsHiddenContext, FlowAmount } from "@/components/amount-text";
import { intervalPhrase } from "@/components/custom-schedule-sheet";
import { LimitToast } from "@/components/limit-toast";
import { ModalClose } from "@/components/modal-close";
import { VoiceOrb } from "@/components/voice/voice-orb";
import type { VoiceOrbState } from "@/components/voice/voice-orb";
import { useDatabase } from "@/contexts/local-data-context";
import { getLastUsedAccount } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { getCategoryById } from "@/data/categories-core";
import { useAiConsent } from "@/data/settings";
import { lastLoggedEntry } from "@/data/transactions-core";
import { transfersRepo } from "@/data/transfers-core";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import type { AuthGate } from "@/domain/auth-gate";
import { formatRelativeDay } from "@/domain/dates";
import type { HapticEvent } from "@/domain/haptics";
import { amountParts, formatAmount, symbolPrefix } from "@/domain/money";
import { paywallHref } from "@/domain/paywall-trigger";
import type { LastEntry } from "@/domain/reminder";
import {
    draftDelta,
    heardSegments,
    resolveVoiceDraft,
    savableEntry,
    savableTransfer,
    stillCurrent,
    transferStillCurrent,
} from "@/domain/voice-entry";
import type {
    AccountCandidate,
    ResolvedVoiceDraft,
    ResolvedVoiceEntry,
    ResolvedVoiceTransfer,
    VoiceDraftField,
    VoiceTurn,
} from "@/domain/voice-entry";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { isLimitRefusal, useLimitNotice } from "@/hooks/use-usage-limits";
import { useVoiceEntry } from "@/hooks/use-voice-entry";
import type { VoiceFailure, VoicePhase } from "@/hooks/use-voice-entry";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import type { VoiceDraft, VoiceQuote } from "@/lib/cloud-ai";
import { freshEntries } from "@/lib/fresh-entries";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { openAppSettings, voidFlowCommand } from "@/state/entry-commands";
import { commitEntry } from "@/state/entry-commit";
import { entryHref } from "@/state/entry-params";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

import { usePromptLedger } from "./use-prompt-ledger";
import { useResolvedPhase } from "./use-resolved-phase";

const ORB_SIZE = 180;
const ORB_SIZE_HEARD = 120;
const ORB_SIZE_SETTLED = 80;
const ORB_PRESS_SCALE = 0.96;
const ORB_SPRING = { damping: 18, mass: 0.9, stiffness: 170 };
const MARK_SIZE = 28;
const MARK_RADIUS = 8;
const HINT_MERCHANT_MAX = 24;

const FAILURE_KEY = {
    denied: "voice.failed.denied",
    notConfigured: "voice.failed.notConfigured",
    notEntitled: "voice.failed.notEntitled",
    offline: "voice.failed.offline",
    provider: "voice.failed.provider",
    quotaExceeded: "voice.failed.quotaExceeded",
    rateLimited: "voice.failed.rateLimited",
    silent: "voice.failed.silent",
    timeout: "voice.failed.timeout",
    unauthenticated: "voice.failed.unauthenticated",
    unclear: "voice.failed.unclear",
} as const satisfies Record<VoiceFailure, string>;

const NO_RETRY_REASONS: ReadonlySet<VoiceFailure> = new Set(["notEntitled", "quotaExceeded"]);

const HANDOFF_HAPTIC: Partial<Record<VoicePhase["kind"], HapticEvent>> = {
    failed: "error",
    listening: "light",
    review: "light",
    sending: "selection",
};

const NO_QUOTES: readonly VoiceQuote[] = [];

const FIELD_KEY = {
    account: "voice.turn.field.account",
    amount: "voice.turn.field.amount",
    category: "voice.turn.field.category",
    date: "voice.turn.field.date",
    details: "voice.turn.field.details",
    kind: "voice.turn.field.kind",
    merchant: "voice.turn.field.merchant",
    schedule: "voice.turn.field.schedule",
} as const satisfies Record<VoiceDraftField, string>;

function orbStateOf(phase: VoicePhase): VoiceOrbState {
    switch (phase.kind) {
        case "listening": {
            return "listening";
        }
        case "sending":
        case "thinking": {
            return "thinking";
        }
        case "review": {
            return "settled";
        }
        case "failed": {
            return "failed";
        }
        default: {
            return "idle";
        }
    }
}

function VoiceShell({
    bottom,
    children,
    closeDisabled = false,
    onClose,
    overlay,
}: {
    bottom: React.ReactNode;
    children: React.ReactNode;
    /** Leaving under a save would land its callbacks on the wrong route. */
    closeDisabled?: boolean;
    onClose: () => void;
    overlay?: React.ReactNode;
}) {
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    return (
        <View className="bg-background flex-1">
            <ModalClose accessibilityLabel={t("voice.close")} disabled={closeDisabled} onPress={onClose} />
            <View className="flex-1 items-center justify-center gap-6 px-6">{children}</View>
            <View className="gap-2 px-5" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                {bottom}
            </View>
            {overlay}
        </View>
    );
}

function OrbControl({
    label,
    level,
    onPress,
    size,
    state,
}: {
    label: string;
    level: SharedValue<number>;
    onPress?: () => void;
    size: number;
    state: VoiceOrbState;
}) {
    const reducedMotion = useReducedMotion();
    const pressed = useSharedValue(1);
    const frame = useDerivedValue(() =>
        reducedMotion ? withTiming(size, { duration: 160 }) : withSpring(size, ORB_SPRING)
    );
    const box = useAnimatedStyle(() => ({ height: frame.get(), width: frame.get() }));
    const canvas = useAnimatedStyle(() => ({
        transform: [{ scale: (frame.get() / ORB_SIZE) * pressed.get() }],
    }));

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            disabled={onPress === undefined}
            onPress={onPress}
            onPressIn={() => pressed.set(withSpring(ORB_PRESS_SCALE, ORB_SPRING))}
            onPressOut={() => pressed.set(withSpring(1, ORB_SPRING))}
        >
            <Animated.View className="items-center justify-center" style={box}>
                <Animated.View style={canvas}>
                    <VoiceOrb level={level} size={ORB_SIZE} state={state} />
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}

function ReviewLine({
    accountName,
    categoryName,
    draft,
}: {
    accountName: string | null;
    categoryName: string | null;
    draft: ResolvedVoiceEntry;
}) {
    const nowMs = useNow();
    const t = useTranslation();
    const { language } = useLanguage();
    const amount = formatAmount(draft.amount, draft.currency, true, language);
    const day = formatRelativeDay(draft.date, new Date(nowMs), language);
    const preposition = t(draft.income ? "voice.review.from" : "voice.review.at");
    const mark = useMerchantMark(draft.merchant, draft.domain);

    return (
        <View className="items-center gap-2 px-6">
            <View accessibilityLabel={amount} accessibilityRole="text" accessible>
                <FlowAmount
                    amount={draft.amount}
                    className={`font-sans-semibold text-hero tabular-nums ${draft.income ? "text-income" : "text-foreground"}`}
                    code={draft.currency}
                    prefix={symbolPrefix(amountParts(draft.amount, draft.currency, true, language).symbol)}
                    showCents
                    still
                />
            </View>
            <View className="flex-row items-center justify-center gap-2">
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
                    {draft.merchant.trim().length > 0 ? draft.merchant : t("voice.review.noMerchant")}
                </Text>
            </View>
            <Text className="text-muted text-center font-sans text-base" numberOfLines={1}>
                {categoryName ?? t("voice.review.noCategory")}
                {draft.recurrence ? (
                    <>
                        <Text className="text-subtle"> · </Text>
                        {t("transaction.schedule.every", {
                            interval: intervalPhrase(t, draft.recurrence.type, draft.recurrence.coefficient),
                        })}
                    </>
                ) : null}
                {accountName ? (
                    <>
                        <Text className="text-subtle"> · </Text>
                        {accountName}
                    </>
                ) : null}
                <Text className="text-subtle"> · </Text>
                {day}
            </Text>
        </View>
    );
}

function TransferReviewLine({ draft }: { draft: ResolvedVoiceTransfer }) {
    const nowMs = useNow();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const amount = formatAmount(draft.amount, draft.currency, true, language);
    const day = formatRelativeDay(draft.date, new Date(nowMs), language);
    const missing = t("voice.review.noAccount");

    return (
        <View className="items-center gap-2 px-6">
            <Text className="font-sans-semibold text-hero tabular-nums" style={{ color: colors.transfer }}>
                {amount}
            </Text>
            <Text className="font-sans-medium text-foreground text-title text-center" numberOfLines={2}>
                {t("voice.review.transfer", {
                    from: draft.fromAccount?.name ?? missing,
                    to: draft.toAccount?.name ?? missing,
                })}
            </Text>
            <Text className="text-muted text-center font-sans text-base" numberOfLines={1}>
                {t("voice.review.transferLabel")}
                <Text className="text-subtle"> · </Text>
                {day}
            </Text>
        </View>
    );
}

const STATUS_SWEEP_MS = 1800;

function StatusLine({ children, waiting = false }: { children: string; waiting?: boolean }) {
    const colors = useColors();
    return (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} key={children}>
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

function HeardSentence({ quotes, text, under }: { quotes: readonly VoiceQuote[]; text: string; under: boolean }) {
    const words = heardSegments(text, quotes).map((segment) =>
        segment.field === null ? (
            segment.text
        ) : (
            <Text
                className={`font-sans-medium ${segment.field === "amount" ? "text-tint" : "text-foreground"}`}
                key={segment.start}
            >
                {segment.text}
            </Text>
        )
    );
    return (
        <Animated.View className="px-4" entering={FadeIn.duration(220)}>
            <Text
                className={
                    under
                        ? "text-subtle text-callout text-center font-sans"
                        : "text-foreground text-title font-sans-medium text-center"
                }
                numberOfLines={4}
            >
                “{words}”
            </Text>
        </Animated.View>
    );
}

function correctionOf(turns: VoiceTurn[], order: number): VoiceDraftField[] | null {
    let previous: VoiceDraft | null = null;
    let current: VoiceDraft | null = null;
    for (const turn of turns) {
        if (turn.kind !== "proposed" || turn.draft === null) {
            continue;
        }
        if (turn.order < order) {
            previous = turn.draft;
        } else if (turn.order === order) {
            current = turn.draft;
        }
    }
    return previous && current ? draftDelta(previous, current) : null;
}

function CorrectionLine({ fields }: { fields: VoiceDraftField[] }) {
    const t = useTranslation();
    return (
        <Animated.View entering={FadeIn.duration(220)}>
            <Text className="text-muted text-caption text-center font-sans">
                {t("voice.turn.updated")}
                <Text className="text-subtle"> · </Text>
                <Text className="font-sans-medium text-foreground">
                    {fields.length === 0
                        ? t("voice.turn.unchanged")
                        : fields.map((field) => t(FIELD_KEY[field])).join(", ")}
                </Text>
            </Text>
        </Animated.View>
    );
}

function latestDraft(turns: VoiceTurn[]): VoiceDraft | null {
    for (let index = turns.length - 1; index >= 0; index -= 1) {
        const turn = turns[index];
        if (turn?.kind === "proposed" && turn.draft !== null) {
            return turn.draft;
        }
    }
    return null;
}

function earlierResolved(
    context: Omit<Parameters<typeof resolveVoiceDraft>[0], "draft" | "now">,
    saying: boolean,
    turns: VoiceTurn[]
): ResolvedVoiceDraft | null {
    const draft = saying ? latestDraft(turns) : null;
    return draft ? resolveVoiceDraft({ ...context, draft, now: new Date() }) : null;
}

function DraftLine({ accounts, draft }: { accounts: readonly AccountCandidate[]; draft: ResolvedVoiceDraft }) {
    const db = useDatabase();
    if (draft.kind === "transfer") {
        return <TransferReviewLine draft={draft} />;
    }
    const categoryName = draft.categoryId ? (getCategoryById(db, draft.categoryId)?.name ?? null) : null;
    const accountName = accounts.find((account) => account.id === draft.accountId)?.name ?? null;
    return <ReviewLine accountName={accountName} categoryName={categoryName} draft={draft} />;
}

const SAYING: ReadonlySet<VoicePhase["kind"]> = new Set(["starting", "listening", "sending", "thinking"]);

function orbSizeOf(phase: VoicePhase, resolved: boolean, company: boolean): number {
    if (resolved) {
        return ORB_SIZE_SETTLED;
    }
    return company || phase.kind === "failed" ? ORB_SIZE_HEARD : ORB_SIZE;
}

function hintShown(phase: VoicePhase, spoke: boolean, turns: VoiceTurn[]): boolean {
    return phase.kind === "listening" && !spoke && turns.length === 0;
}

function useHandoffHaptics(kind: VoicePhase["kind"]) {
    const haptics = useHaptics();
    // oxlint-disable-next-line outlayr/react-effect-budget -- plays the Taptic cue for each voice phase, which settles from recorder and Convex events with no single handler
    useEffect(() => {
        const cue = HANDOFF_HAPTIC[kind];
        if (cue) {
            haptics(cue);
        }
    }, [haptics, kind]);
}

const voiceHintSeedAtom = Atom.family((db: Database) =>
    Atom.make(
        Effect.suspend(() => lastLoggedEntry(db, new Date())).pipe(
            Effect.catchTags({ TransactionsError: () => Effect.succeed(null) }),
            Effect.catchDefect(() => Effect.succeed(null)),
            Effect.map((last: LastEntry | null) => ({ account: getLastUsedAccount(db)?.name ?? null, last }))
        )
    ).pipe(Atom.withLabel("voice:hint-seed"))
);

function useVoiceHint(): string | null {
    const db = useDatabase();
    const t = useTranslation();
    const amountsHidden = use(AmountsHiddenContext);
    const seedResult = useAtomValue(voiceHintSeedAtom(db));

    if (!AsyncResult.isSuccess(seedResult)) {
        return null;
    }
    const seed = seedResult.value;
    const merchant = seed.last?.note.trim() ?? "";
    const usable =
        !amountsHidden &&
        seed.last !== null &&
        !seed.last.income &&
        merchant.length > 0 &&
        merchant.length <= HINT_MERCHANT_MAX;
    let example = t("voice.hint.fallback");
    if (usable && seed.last) {
        const amount = String(Math.max(1, Math.round(seed.last.amount)));
        example = seed.account
            ? t("voice.hint.exampleAccount", { account: seed.account, amount, merchant })
            : t("voice.hint.example", { amount, merchant });
    }
    return t("voice.hint", { example });
}

function VoiceGateScreen({ gate }: { gate: Exclude<AuthGate, "signed-in"> }) {
    const router = useRouter();
    const t = useTranslation();
    let status = t("voice.state.starting");
    if (gate === "unconfigured") {
        status = t("voice.failed.notConfigured");
    } else if (gate === "signed-out") {
        status = t("voice.failed.unauthenticated");
    }
    return (
        <VoiceShell bottom={null} onClose={() => router.back()}>
            <VoiceOrb size={ORB_SIZE} state={gate === "restoring" ? "idle" : "failed"} />
            <StatusLine waiting={gate === "restoring"}>{status}</StatusLine>
        </VoiceShell>
    );
}

interface BarAction {
    label: string;
    onPress: () => void;
}

/** Nothing while a clip is on its way or a save is in flight. */
function orbActionOf(
    phase: VoicePhase,
    saving: boolean,
    actions: { finish: () => void; listenAgain: () => void; seePro: () => void },
    t: TranslateFn,
    entitled: boolean
) {
    if (phase.kind === "sending" || phase.kind === "thinking" || phase.kind === "starting") {
        return { label: t("voice.state.thinking"), onPress: undefined };
    }
    if (phase.kind === "review") {
        return { label: t("voice.action.fix"), onPress: saving ? undefined : actions.listenAgain };
    }
    if (phase.kind === "failed") {
        if (phase.reason === "notEntitled") {
            return entitled
                ? { label: t("voice.action.retry"), onPress: actions.listenAgain }
                : { label: t("pro.action.see"), onPress: actions.seePro };
        }
        return NO_RETRY_REASONS.has(phase.reason)
            ? { label: t(FAILURE_KEY[phase.reason]), onPress: undefined }
            : { label: t("voice.action.retry"), onPress: actions.listenAgain };
    }
    return { label: t("voice.mic.finish"), onPress: actions.finish };
}

function failedActions(
    reason: VoiceFailure,
    t: TranslateFn,
    handlers: { listenAgain: () => void; openSettings: () => void; seePro: () => void },
    entitled: boolean
) {
    if (reason === "notEntitled") {
        return entitled
            ? { primary: { label: t("voice.action.retry"), onPress: handlers.listenAgain }, secondary: null }
            : { primary: { label: t("pro.action.see"), onPress: handlers.seePro }, secondary: null };
    }
    if (NO_RETRY_REASONS.has(reason)) {
        return { primary: null, secondary: null };
    }
    return {
        primary: { label: t("voice.action.retry"), onPress: handlers.listenAgain },
        secondary: reason === "denied" ? { label: t("voice.action.settings"), onPress: handlers.openSettings } : null,
    };
}

interface WriteDone {
    onFailed: () => void;
    onSaved: () => void;
}

const writeEntry = Effect.fn("VoiceThread.writeEntry")(function* writeEntry(
    db: Database,
    draft: ResolvedVoiceEntry,
    categoryId: string,
    done: WriteDone
) {
    const { recurrence } = draft;
    const outcome = yield* commitEntry({
        db,
        draft: {
            accountId: draft.accountId,
            amount: draft.amount,
            categoryId,
            currency: draft.currency,
            date: draft.date,
            details: draft.details,
            income: draft.income,
            merchant: draft.merchant,
            schedule:
                recurrence === null
                    ? null
                    : { coefficient: recurrence.coefficient, endDate: null, leadDays: null, type: recurrence.type },
        },
        source: "voice",
    });
    if (outcome.kind === "failed") {
        // The row did not land; the form has the failure strip this screen lacks.
        done.onFailed();
        return;
    }
    done.onSaved();
});

/** Same-currency legs only (`savableTransfer`): rate 1, no fee. */
const writeTransfer = Effect.fn("VoiceThread.writeTransfer")(function* writeTransfer(
    db: Database,
    draft: ResolvedVoiceTransfer,
    from: { id: string },
    to: { id: string },
    done: WriteDone
) {
    const created = yield* transfersRepo
        .create(db, {
            date: draft.date,
            exchangeRate: 1,
            exchangeRateType: null,
            fromAccountId: from.id,
            fromAmount: draft.amount,
            fromCurrency: draft.currency,
            note: draft.details ?? "",
            toAccountId: to.id,
            toAmount: draft.amount,
            toCurrency: draft.currency,
        })
        .pipe(Effect.exit);
    if (Exit.isFailure(created)) {
        done.onFailed();
        return;
    }
    freshEntries.mark(created.value);
    posthog?.capture("transfer_saved", {
        cross_currency: false,
        has_fee: false,
        mode: "create",
        source: "voice",
    });
    done.onSaved();
});

function VoiceThreadScreen() {
    const router = useRouter();
    const db = useDatabase();
    const runFlow = useAtomCommand(voidFlowCommand);
    const t = useTranslation();
    const haptics = useHaptics();
    const { language } = useLanguage();
    const currency = useGlobalCurrency(db);
    const { accounts, bounded, context, live } = usePromptLedger(db, currency);
    const [saving, setSaving] = useState(false);
    const navigation = useNavigation();

    const request = {
        accounts: bounded.accounts,
        categoryTree: bounded.categoryTree,
        currency,
        language,
    };

    const { cancel, finish, heard, level, listenAgain, phase, spoke, turns } = useVoiceEntry({ context, request });
    const hint = useVoiceHint();
    const refusal = phase.kind === "failed" && isLimitRefusal(phase.reason) ? phase.reason : null;
    const limit = useLimitNotice("voiceEntry", refusal);

    const resolved = useResolvedPhase(phase, (next) =>
        next.kind === "review" ? resolveVoiceDraft({ ...next.context, draft: next.draft, now: new Date() }) : null
    );
    const entry = resolved?.kind === "entry" ? resolved : null;
    const transfer = resolved?.kind === "transfer" ? resolved : null;
    const saying = SAYING.has(phase.kind);
    const earlier = earlierResolved(context, saying, turns);
    const shown = resolved ?? earlier;
    useHandoffHaptics(phase.kind);
    const savableCategoryId = entry && stillCurrent(entry, live) ? (savableEntry(entry)?.categoryId ?? null) : null;

    const close = () => {
        cancel();
        router.back();
    };

    const openForm = (draft: ResolvedVoiceEntry) => {
        // An account sync removed is a question for the form, not a seed to swap for the last used.
        const accountLive = draft.accountId === null || live.accountIds.has(draft.accountId);
        router.replace(
            entryHref({
                accountId: accountLive ? (draft.accountId ?? undefined) : undefined,
                accountUnresolved: draft.accountUnresolved || !accountLive,
                amount: draft.amount,
                categoryId: draft.categoryId ?? undefined,
                currency: draft.currency,
                date: draft.date,
                details: draft.details ?? undefined,
                income: draft.income,
                note: draft.merchant,
                recurrence: draft.recurrence ?? undefined,
            })
        );
    };

    // A leg sync removed is a question for the editor, not a seed to swap for another account.
    const leg = (account: { id: string } | null, unresolved: boolean) => {
        const current = account !== null && live.accountIds.has(account.id);
        return {
            id: current ? account.id : undefined,
            unresolved: unresolved || (account !== null && !current),
        };
    };

    const openTransferForm = (draft: ResolvedVoiceTransfer) => {
        const from = leg(draft.fromAccount, draft.fromUnresolved);
        const to = leg(draft.toAccount, draft.toUnresolved);
        const params = {
            amount: String(draft.amount),
            currency: draft.currency,
            date: String(draft.date.getTime()),
            fromAccountId: from.id,
            fromUnresolved: from.unresolved ? "1" : undefined,
            note: draft.details ?? undefined,
            toAccountId: to.id,
            toUnresolved: to.unresolved ? "1" : undefined,
        };
        router.replace({ params, pathname: "/transactions/transfers/create" });
    };

    const finishSaving = () => {
        haptics("success");
        // A modal gesture can dismiss this mid-write; popping again would take the screen beneath.
        if (navigation.isFocused()) {
            router.back();
        }
    };

    const save = (draft: ResolvedVoiceEntry, categoryId: string) => {
        setSaving(true);
        void runFlow(
            writeEntry(db, draft, categoryId, {
                onFailed: () => {
                    setSaving(false);
                    if (navigation.isFocused()) {
                        openForm(draft);
                    }
                },
                onSaved: finishSaving,
            })
        );
    };

    const saveTransfer = (draft: ResolvedVoiceTransfer, from: { id: string }, to: { id: string }) => {
        setSaving(true);
        void runFlow(
            writeTransfer(db, draft, from, to, {
                onFailed: () => {
                    setSaving(false);
                    if (navigation.isFocused()) {
                        openTransferForm(draft);
                    }
                },
                onSaved: finishSaving,
            })
        );
    };

    const seePro = () => {
        router.push(paywallHref("captures"));
    };

    const entitled = useProEntitled();

    const status = (() => {
        switch (phase.kind) {
            case "starting": {
                return t("voice.state.starting");
            }
            case "listening": {
                return t("voice.state.listening");
            }
            case "sending":
            case "thinking": {
                return t("voice.state.thinking");
            }
            case "failed": {
                return t(FAILURE_KEY[phase.reason]);
            }
            default: {
                return null;
            }
        }
    })();

    const settled = resolved !== null || phase.kind === "failed";
    const transferLegs = transfer && transferStillCurrent(transfer, live) ? savableTransfer(transfer) : null;

    const moved = phase.kind === "review" ? correctionOf(turns, phase.order) : null;

    let primary: BarAction | null = null;
    let secondary: BarAction | null = null;
    if (entry) {
        secondary = { label: t("voice.action.edit"), onPress: () => openForm(entry) };
        primary =
            savableCategoryId === null
                ? { label: t("voice.action.finish"), onPress: () => openForm(entry) }
                : { label: t("voice.action.save"), onPress: () => save(entry, savableCategoryId) };
    } else if (transfer) {
        secondary = { label: t("voice.action.edit"), onPress: () => openTransferForm(transfer) };
        primary = transferLegs
            ? {
                  label: t("voice.action.save"),
                  onPress: () => saveTransfer(transfer, transferLegs.from, transferLegs.to),
              }
            : { label: t("voice.action.finish"), onPress: () => openTransferForm(transfer) };
    } else if (phase.kind === "failed") {
        ({ primary, secondary } = failedActions(
            phase.reason,
            t,
            { listenAgain, openSettings: () => runFlow(openAppSettings), seePro },
            entitled
        ));
    }

    const bottom = settled ? (
        <Animated.View className="gap-1" entering={FadeIn.duration(220)}>
            <View className="flex-row items-center gap-2.5">
                {secondary ? (
                    <View className="flex-1">
                        <Button
                            className="rounded-full"
                            disabled={saving}
                            fullWidth
                            onPress={secondary.onPress}
                            size="md"
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
                            disabled={saving}
                            fullWidth
                            onPress={primary.onPress}
                            size="md"
                            variant="primary"
                        >
                            {primary.label}
                        </Button>
                    </View>
                ) : null}
            </View>
            {resolved ? (
                <Button className="rounded-full" disabled={saving} onPress={listenAgain} size="md" variant="ghost">
                    {t("voice.action.fix")}
                </Button>
            ) : null}
        </Animated.View>
    ) : null;

    const orb = orbActionOf(phase, saving, { finish, listenAgain, seePro }, t, entitled);

    return (
        <VoiceShell
            bottom={bottom}
            closeDisabled={saving}
            onClose={close}
            overlay={<LimitToast feature="voiceEntry" {...limit} />}
        >
            <OrbControl
                label={orb.label}
                level={level}
                onPress={orb.onPress}
                size={orbSizeOf(phase, resolved !== null, shown !== null || heard !== null)}
                state={orbStateOf(phase)}
            />
            {shown ? (
                <Animated.View entering={FadeIn.duration(260)}>
                    <DraftLine accounts={accounts} draft={shown} />
                </Animated.View>
            ) : null}
            {heard ? (
                <HeardSentence
                    quotes={phase.kind === "review" ? phase.quotes : NO_QUOTES}
                    text={heard}
                    under={shown !== null}
                />
            ) : null}
            {status && refusal === null ? <StatusLine waiting={phase.kind !== "failed"}>{status}</StatusLine> : null}
            {hint && hintShown(phase, spoke, turns) ? (
                <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
                    <Text className="text-grammar text-caption text-center font-sans">{hint}</Text>
                </Animated.View>
            ) : null}
            {moved ? <CorrectionLine fields={moved} /> : null}
        </VoiceShell>
    );
}

/** The recorder and thread need the Convex provider, mounted only when signed in; consent comes first. */
export function VoiceEntryScreen() {
    const { gate } = useAuthSession();
    const consent = useAiConsent(useDatabase());
    if (gate === "signed-in") {
        return consent === "allowed" ? <VoiceThreadScreen /> : <AiConsentGate />;
    }
    return <VoiceGateScreen gate={gate} />;
}
