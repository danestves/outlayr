import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import { useNavigation, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Shimmer } from "panelui-native/components/shimmer";
import { use, useEffect, useState } from "react";
import type React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
    useAnimatedStyle,
    useDerivedValue,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiConsentGate } from "@/components/ai-consent";
import { AmountsHiddenContext } from "@/components/amount-text";
import { LimitToast } from "@/components/limit-toast";
import { ModalClose } from "@/components/modal-close";
import { ORI_GOT_IT_MS, OriVoice } from "@/components/voice/ori-voice";
import type { OriState } from "@/components/voice/ori-voice";
import { VoiceSentenceView } from "@/components/voice/voice-sentence";
import { useDatabase } from "@/contexts/local-data-context";
import { getLastUsedAccount } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { getCategoryById } from "@/data/categories-core";
import { useAiConsent } from "@/data/settings";
import { lastLoggedEntry } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import type { AuthGate } from "@/domain/auth-gate";
import type { HapticEvent } from "@/domain/haptics";
import { paywallHref } from "@/domain/paywall-trigger";
import type { LastEntry } from "@/domain/reminder";
import {
    heardSegments,
    resolveVoiceDraft,
    savableEntry,
    savableTransfer,
    stillCurrent,
    transferStillCurrent,
} from "@/domain/voice-entry";
import type { ResolvedVoiceDraft, ResolvedVoiceEntry, ResolvedVoiceTransfer, VoiceTurn } from "@/domain/voice-entry";
import { createLiveParser } from "@/domain/voice-live";
import type { LiveContext } from "@/domain/voice-live";
import { overlayLive, sentenceFromLive, sentenceFromResolved, withCorrection } from "@/domain/voice-sentence";
import type { VoiceSentence } from "@/domain/voice-sentence";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { isLimitRefusal, useLimitNotice } from "@/hooks/use-usage-limits";
import { useVoiceEntry } from "@/hooks/use-voice-entry";
import type { VoiceFailure, VoicePhase } from "@/hooks/use-voice-entry";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { languageSubtag } from "@/i18n/languages";
import { useAuthSession } from "@/lib/auth-session";
import type { VoiceDraft, VoiceQuote } from "@/lib/cloud-ai";
import { useHaptics } from "@/lib/use-haptics";
import { saveTransferCommand } from "@/state/accounts-commands";
import { fromCommand, openAppSettings, voidFlowCommand } from "@/state/entry-commands";
import { commitEntry } from "@/state/entry-commit";
import { entryHref } from "@/state/entry-params";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

import { voiceEntryDraft } from "./entry-drafts";
import { usePromptLedger } from "./use-prompt-ledger";
import { useResolvedPhase } from "./use-resolved-phase";

const ORI_SIZE = 150;
const ORI_SIZE_SETTLED = 84;
const ORI_PRESS_SCALE = 0.96;
const ORI_SPRING = { damping: 18, mass: 0.9, stiffness: 170 };
const HEARD_AFTER_MOVE_MS = 300;
const BUTTONS_AFTER_HOLD_MS = 120;
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

function oriStateOf(phase: VoicePhase): OriState {
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
    contentClassName = "flex-1 items-center justify-center gap-6 px-6",
    onClose,
    overlay,
}: {
    bottom: React.ReactNode;
    children: React.ReactNode;
    /** Leaving under a save would land its callbacks on the wrong route. */
    closeDisabled?: boolean;
    contentClassName?: string;
    onClose: () => void;
    overlay?: React.ReactNode;
}) {
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    return (
        <View className="bg-background flex-1">
            <ModalClose accessibilityLabel={t("voice.close")} disabled={closeDisabled} onPress={onClose} />
            <View className={contentClassName}>{children}</View>
            <View className="gap-2 px-5" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                {bottom}
            </View>
            {overlay}
        </View>
    );
}

function OriControl({
    delayMs,
    label,
    level,
    onPress,
    size,
    state,
}: {
    delayMs: number;
    /** Absent once settled: she is decoration there, and the buttons below carry the actions. */
    label?: string;
    level: SharedValue<number>;
    onPress?: () => void;
    size: number;
    state: OriState;
}) {
    const reducedMotion = useReducedMotion();
    const pressed = useSharedValue(1);
    const frame = useDerivedValue(() =>
        reducedMotion ? withTiming(size, { duration: 160 }) : withDelay(delayMs, withSpring(size, ORI_SPRING))
    );
    const box = useAnimatedStyle(() => ({ height: frame.get(), width: frame.get() }));
    const canvas = useAnimatedStyle(() => ({
        transform: [{ scale: (frame.get() / ORI_SIZE) * pressed.get() }],
    }));

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole={label === undefined ? undefined : "button"}
            accessible={label !== undefined}
            disabled={onPress === undefined}
            onPress={onPress}
            onPressIn={() => pressed.set(withSpring(ORI_PRESS_SCALE, ORI_SPRING))}
            onPressOut={() => pressed.set(withSpring(1, ORI_SPRING))}
        >
            <Animated.View className="items-center justify-center" style={box}>
                <Animated.View style={canvas}>
                    <OriVoice level={level} size={ORI_SIZE} state={state} />
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}

function VoiceBar({
    buttons,
    caption,
    level,
    settled,
    state,
    tap,
}: {
    buttons: React.ReactNode;
    caption: React.ReactNode;
    level: SharedValue<number>;
    settled: boolean;
    state: OriState;
    tap: { label: string; onPress?: () => void };
}) {
    const reducedMotion = useReducedMotion();
    const holdMs = settled && !reducedMotion ? ORI_GOT_IT_MS : 0;
    // Keyed so Ori moves above the heard sentence on settle instead of remounting, which would skip her hop.
    // The sentence and buttons fade in only once she has left their slots.
    const ori = (
        <Animated.View className="items-center" key="ori" layout={LinearTransition.delay(holdMs)}>
            <OriControl
                delayMs={holdMs}
                label={settled ? undefined : tap.label}
                level={level}
                onPress={settled ? undefined : tap.onPress}
                size={settled ? ORI_SIZE_SETTLED : ORI_SIZE}
                state={state}
            />
        </Animated.View>
    );
    const captioned = caption ? (
        <Animated.View
            entering={settled ? FadeIn.delay(holdMs + HEARD_AFTER_MOVE_MS).duration(220) : undefined}
            key={settled ? "heard" : "live"}
        >
            {caption}
        </Animated.View>
    ) : null;
    return (
        <View className="gap-5">
            {settled ? [ori, captioned] : [captioned, ori]}
            {settled && buttons ? (
                <Animated.View entering={FadeIn.delay(holdMs + BUTTONS_AFTER_HOLD_MS).duration(220)}>
                    {buttons}
                </Animated.View>
            ) : (
                buttons
            )}
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

const SAYING: ReadonlySet<VoicePhase["kind"]> = new Set(["starting", "listening", "sending", "thinking"]);

function hintShown(phase: VoicePhase, spoke: boolean, turns: VoiceTurn[], partial: string): boolean {
    return phase.kind === "listening" && !spoke && turns.length === 0 && partial === "";
}

const CAPTION_MAX_CHARS = 140;

function LiveCaption({ caret, text }: { caret: boolean; text: string }) {
    const tail = text.trim().slice(-CAPTION_MAX_CHARS);
    const cut = tail.lastIndexOf(" ") + 1;
    return (
        <Text className="text-muted font-sans-medium text-lg" numberOfLines={3}>
            {tail.slice(0, cut)}
            <Text className="text-foreground font-sans-semibold">{tail.slice(cut)}</Text>
            {caret ? <Text className="text-tint font-sans-semibold">|</Text> : null}
        </Text>
    );
}

function draftBefore(turns: VoiceTurn[], order: number): VoiceDraft | null {
    let found: VoiceDraft | null = null;
    for (const turn of turns) {
        if (turn.kind === "proposed" && turn.draft !== null && turn.order < order) {
            found = turn.draft;
        }
    }
    return found;
}

type ResolveContext = Omit<Parameters<typeof resolveVoiceDraft>[0], "draft" | "now">;

function resolvedBefore(context: ResolveContext, turns: VoiceTurn[], order: number): ResolvedVoiceDraft | null {
    const draft = draftBefore(turns, order);
    return draft ? resolveVoiceDraft({ ...context, draft, now: new Date() }) : null;
}

interface SentenceParts {
    earlier: ResolvedVoiceDraft | null;
    live: VoiceSentence | null;
    previous: ResolvedVoiceDraft | null;
    resolved: ResolvedVoiceDraft | null;
}

function sentenceOf({ earlier, live, previous, resolved }: SentenceParts): VoiceSentence | null {
    if (resolved) {
        return withCorrection(sentenceFromResolved(resolved), previous && sentenceFromResolved(previous));
    }
    const base = earlier && sentenceFromResolved(earlier);
    return live && base ? overlayLive(base, live) : (live ?? base);
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
            <OriVoice size={ORI_SIZE} state={gate === "restoring" ? "idle" : "failed"} />
            <StatusLine waiting={gate === "restoring"}>{status}</StatusLine>
        </VoiceShell>
    );
}

interface BarAction {
    label: string;
    onPress: () => void;
}

/** Nothing while a clip is on its way or a save is in flight. */
function oriActionOf(
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
    const outcome = yield* commitEntry({ db, draft: voiceEntryDraft(draft, categoryId), source: "voice" });
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
    const created = yield* fromCommand(saveTransferCommand, {
        db,
        id: null,
        input: {
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
        },
        source: "voice",
    }).pipe(Effect.exit);
    if (Exit.isFailure(created)) {
        done.onFailed();
        return;
    }
    done.onSaved();
});

function useVoiceSentence({
    context,
    currency,
    heard,
    partial,
    phase,
    resolved,
    turns,
}: {
    context: ResolveContext & Pick<LiveContext, "accounts" | "categories">;
    currency: string;
    heard: string | null;
    partial: string;
    phase: VoicePhase;
    resolved: ResolvedVoiceDraft | null;
    turns: VoiceTurn[];
}) {
    const { language } = useLanguage();
    const [parse] = useState(() =>
        createLiveParser({
            accounts: context.accounts,
            categories: context.categories,
            currency,
            language,
            now: new Date(),
        })
    );
    const saying = SAYING.has(phase.kind);
    const earlier = saying ? resolvedBefore(context, turns, Number.POSITIVE_INFINITY) : null;
    const previous = phase.kind === "review" ? resolvedBefore(context, turns, phase.order) : null;
    const spokenText = phase.kind === "listening" ? partial : heard;
    const heardWords = saying && spokenText !== null && spokenText.trim() !== "" ? spokenText : null;
    const live =
        heardWords === null ? null : sentenceFromLive(parse(heardWords, { final: phase.kind !== "listening" }));
    return { heardWords, sentence: sentenceOf({ earlier, live, previous, resolved }) };
}

function captionOf({
    heard,
    heardWords,
    phase,
    saying,
    underSentence,
}: {
    heard: string | null;
    heardWords: string | null;
    phase: VoicePhase;
    saying: boolean;
    underSentence: boolean;
}) {
    if (heardWords !== null) {
        return <LiveCaption caret={phase.kind === "listening"} text={heardWords} />;
    }
    if (heard && !saying) {
        return (
            <HeardSentence
                quotes={phase.kind === "review" ? phase.quotes : NO_QUOTES}
                text={heard}
                under={underSentence}
            />
        );
    }
    return null;
}

function editorOf(
    resolved: ResolvedVoiceDraft,
    openForm: (draft: ResolvedVoiceEntry) => void,
    openTransferForm: (draft: ResolvedVoiceTransfer) => void
) {
    return () => (resolved.kind === "entry" ? openForm(resolved) : openTransferForm(resolved));
}

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

    const { cancel, finish, heard, level, listenAgain, partial, phase, spoke, turns } = useVoiceEntry({
        context,
        language: languageSubtag(language),
        request,
    });
    const hint = useVoiceHint();
    const refusal = phase.kind === "failed" && isLimitRefusal(phase.reason) ? phase.reason : null;
    const limit = useLimitNotice("voiceEntry", refusal);

    const resolved = useResolvedPhase(phase, (next) =>
        next.kind === "review" ? resolveVoiceDraft({ ...next.context, draft: next.draft, now: new Date() }) : null
    );
    const entry = resolved?.kind === "entry" ? resolved : null;
    const transfer = resolved?.kind === "transfer" ? resolved : null;
    const saying = SAYING.has(phase.kind);
    const { heardWords, sentence } = useVoiceSentence({ context, currency, heard, partial, phase, resolved, turns });
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

    const buttons = settled ? (
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

    const tap = oriActionOf(phase, saving, { finish, listenAgain, seePro }, t, entitled);
    const onEdit = resolved ? editorOf(resolved, openForm, openTransferForm) : undefined;

    const caption = captionOf({ heard, heardWords, phase, saying, underSentence: sentence !== null });

    const bottom = (
        <VoiceBar
            buttons={buttons}
            caption={caption}
            level={level}
            settled={resolved !== null}
            state={oriStateOf(phase)}
            tap={tap}
        />
    );

    const waiting = phase.kind === "sending" || phase.kind === "thinking";

    return (
        <VoiceShell
            bottom={bottom}
            closeDisabled={saving}
            contentClassName="flex-1 gap-5 px-6 pt-6"
            onClose={close}
            overlay={<LimitToast feature="voiceEntry" {...limit} />}
        >
            {sentence ? (
                <VoiceSentenceView
                    accountName={(id) => accounts.find((account) => account.id === id)?.name ?? null}
                    categoryName={(id) => getCategoryById(db, id)?.name ?? null}
                    currency={currency}
                    onEdit={onEdit}
                    sentence={sentence}
                />
            ) : null}
            {status && refusal === null && (sentence === null || waiting) ? (
                <StatusLine waiting={phase.kind !== "failed"}>{status}</StatusLine>
            ) : null}
            {hint && hintShown(phase, spoke, turns, partial) ? (
                <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
                    <Text className="text-grammar text-caption font-sans">{hint}</Text>
                </Animated.View>
            ) : null}
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
