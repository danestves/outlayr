import { addDays } from "@outlayr/money/calendar";
import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";

import { AppScreen, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import {
    ButtonPair,
    CaptureButton,
    MODAL,
    ModalBackdrop,
    ModalBody,
    ORI_CELL,
    ORI_SETTLED,
    ORI_SIZE,
    OriSprite,
    frameAttrs,
} from "./capture-parts";
import type { FrameStyle } from "./capture-parts";
import { formatDayTitle } from "./dates";
import { parseSentence, Words } from "./entry-sentence";
import { CATEGORY_KEYS, accountOf } from "./entry-state";
import { DEMO_NOW } from "./ledger";
import { currencyFor, formatAmount } from "./money";
import { appTranslator, interpolate } from "./strings";
import type { AppT } from "./strings";
import { roundedTrak } from "./type";
import { heardBy, isField, parseTake } from "./voice-take";
import type { Take, TakeField } from "./voice-take";

export type VoicePhase = "starting" | "ready" | "listening" | "sending" | "thinking" | "result" | "corrected";

type Mark = "open" | "fallback" | "guessed" | "confirmed";

export interface VoicePart {
    readonly mark: Mark;
    readonly text: string;
    readonly was?: string;
}

export type VoiceDraft = Readonly<Record<TakeField, VoicePart>>;

const RULE_BOTTOM = 7;
const STROKE = 2;
const PIXEL = 1 / 3;
const HINT_EXAMPLE = { amount: "4", merchant: "GitHub" } as const;
const LISTENING_STILL_WORDS = 5;
const CAPTION_MAX_CHARS = 140;
const CHASE = "acc-chase";
const LARGE: FrameStyle = { "--app-trak": roundedTrak(18) };

const broken = (color: string, unit: number) => {
    const dashes = `repeating-linear-gradient(90deg, ${color} 0 ${unit}px, transparent ${unit}px ${unit * 2}px)`;
    const path = `calc(100cqw + ${PIXEL}px)`;
    return `${dashes} 0 0 / auto, ${dashes} calc(mod(2 * ${path}, ${unit * 2}px) - ${unit}px) 0 / auto`;
};

const RULE: Record<Mark, { background: string; broken: boolean }> = {
    confirmed: { background: "var(--foreground)", broken: false },
    fallback: { background: broken("var(--grammar)", STROKE), broken: true },
    guessed: { background: broken("var(--grammar)", STROKE * 3), broken: true },
    open: { background: broken("var(--tint)", STROKE * 3), broken: true },
};

const TONE: Record<Mark, string> = {
    confirmed: "text-foreground",
    fallback: "text-muted",
    guessed: "text-foreground",
    open: "text-tint",
};

function Part({ part }: { part: VoicePart }) {
    const rule = RULE[part.mark];
    return (
        <div>
            <div className="flex-row items-baseline gap-1.5">
                {part.was === undefined ? null : <Words className="text-muted line-through">{part.was}</Words>}
                <Words className={TONE[part.mark]}>{part.text}</Words>
            </div>
            {rule.broken ? (
                <div
                    className="absolute"
                    style={{
                        bottom: RULE_BOTTOM,
                        containerType: "inline-size",
                        height: STROKE,
                        left: STROKE / 2,
                        right: STROKE / 2,
                    }}
                >
                    <div className="absolute inset-0" style={{ background: rule.background }} />
                </div>
            ) : (
                <div
                    className="absolute inset-x-0 rounded-full"
                    style={{ background: rule.background, bottom: RULE_BOTTOM, height: STROKE }}
                />
            )}
        </div>
    );
}

const BLANK_KEYS = {
    account: "transaction.sentence.blank.account",
    amount: "transfers.sentence.blank.amount",
    category: "transaction.sentence.blank.category",
    merchant: "transaction.sentence.blank.merchant",
    when: "common.today",
} as const;

export function VoiceSentence({ draft }: { draft: VoiceDraft }) {
    const { t } = useReplica();
    return (
        <div className="flex-row flex-wrap items-baseline gap-x-2">
            {parseSentence(t("voice.sentence.expense")).map((cluster, index) => (
                <div
                    className="shrink flex-row items-baseline"
                    key={`${index}:${cluster.map((atom) => atom.value).join(",")}`}
                >
                    {cluster.map((atom, atomIndex) =>
                        atom.kind === "slot" && isField(atom.value) ? (
                            <div className="shrink" key={`${atomIndex}:${atom.value}`}>
                                <Part part={draft[atom.value]} />
                            </div>
                        ) : (
                            <Words className="text-grammar" key={`${atomIndex}:${atom.value}`}>
                                {atom.value}
                            </Words>
                        )
                    )}
                </div>
            ))}
        </div>
    );
}

export function voiceTake(locale: Locale) {
    const { labels } = getIntlayer("appUi", locale);
    return { fix: parseTake(labels.sayFix), take: parseTake(labels.sayTake) };
}

const blank = (t: AppT, field: TakeField): VoicePart => ({
    mark: field === "when" ? "fallback" : "open",
    text: t(BLANK_KEYS[field]),
});

function values(locale: Locale, t: AppT): Record<TakeField, string> {
    return {
        account: accountOf(CHASE)?.name ?? "",
        amount: formatAmount(42, currencyFor(locale), locale),
        category: t(CATEGORY_KEYS.Groceries),
        merchant: "Costco",
        when: formatDayTitle(DEMO_NOW, DEMO_NOW, locale, t),
    };
}

const FIELDS = ["amount", "merchant", "category", "account", "when"] as const satisfies readonly TakeField[];

export function liveDraft(take: Take, words: number, locale: Locale, t: AppT): VoiceDraft | null {
    if (!heardBy(take, "amount", words)) {
        return null;
    }
    const filled = values(locale, t);
    const part = (field: TakeField): VoicePart =>
        field !== "merchant" && heardBy(take, field, words)
            ? { mark: "guessed", text: filled[field] }
            : blank(t, field);
    return {
        account: part("account"),
        amount: part("amount"),
        category: part("category"),
        merchant: part("merchant"),
        when: part("when"),
    };
}

export function resolvedDraft(locale: Locale, t: AppT, corrected: boolean): VoiceDraft {
    const filled = values(locale, t);
    const confirmed = (field: TakeField): VoicePart => ({ mark: "confirmed", text: filled[field] });
    return {
        account: confirmed("account"),
        amount: confirmed("amount"),
        category: confirmed("category"),
        merchant: confirmed("merchant"),
        when: corrected
            ? {
                  mark: "confirmed",
                  text: formatDayTitle(addDays(DEMO_NOW, -1), DEMO_NOW, locale, t),
                  was: filled.when,
              }
            : confirmed("when"),
    };
}

export function draftText(draft: VoiceDraft, t: AppT): string {
    const text = Object.fromEntries(FIELDS.map((field) => [field, draft[field].text]));
    return interpolate(t("voice.sentence.expense"), text);
}

export function StatusLine({ children, style }: { children: string; style?: FrameStyle }) {
    return (
        <div {...frameAttrs(style)} style={style}>
            <span className="font-sans-medium text-muted text-center text-lg">{children}</span>
        </div>
    );
}

export function Hint({ style }: { style?: FrameStyle }) {
    const { t } = useReplica();
    const example = interpolate(t("voice.hint.example"), HINT_EXAMPLE);
    return (
        <div {...frameAttrs(style)} style={style}>
            <span className="text-grammar text-caption font-sans">{interpolate(t("voice.hint"), { example })}</span>
        </div>
    );
}

export function captionText(take: Take, words: number) {
    const tail = take.words.slice(0, words).join(" ").slice(-CAPTION_MAX_CHARS);
    const cut = tail.lastIndexOf(" ") + 1;
    return { head: tail.slice(0, cut), last: tail.slice(cut) };
}

export function LiveCaption({
    caret,
    style,
    take,
    words,
}: {
    caret: boolean;
    style?: FrameStyle;
    take: Take;
    words: number;
}) {
    const { head, last } = captionText(take, words);
    return (
        <div {...frameAttrs(style)} style={style}>
            <span className="text-muted font-sans-medium text-lg" style={LARGE}>
                {head}
                <span className="text-foreground font-sans-semibold">{last}</span>
                {caret ? <span className="text-tint font-sans-semibold">|</span> : null}
            </span>
        </div>
    );
}

export function HeardSentence({ style, take }: { style?: FrameStyle; take: Take }) {
    return (
        <div className="px-4" {...frameAttrs(style)} style={style}>
            <span className="text-subtle text-callout text-center font-sans">
                “
                {take.segments.map((segment, index) =>
                    segment.field === null ? (
                        segment.text
                    ) : (
                        <span
                            className={`font-sans-medium ${segment.field === "amount" ? "text-tint" : "text-foreground"}`}
                            key={`${index}:${segment.text}`}
                        >
                            {segment.text}
                        </span>
                    )
                )}
                ”
            </span>
        </div>
    );
}

export function VoiceButtons({ style }: { style?: FrameStyle }) {
    const { t } = useReplica();
    return (
        <div {...frameAttrs(style)} style={style}>
            <ButtonPair
                primary={<CaptureButton variant="primary">{t("voice.action.save")}</CaptureButton>}
                secondary={<CaptureButton variant="secondary">{t("voice.action.edit")}</CaptureButton>}
                tertiary={<CaptureButton variant="ghost">{t("voice.action.fix")}</CaptureButton>}
            />
        </div>
    );
}

export function VoiceContent({ children, style }: { children: ReactNode; style?: FrameStyle }) {
    return (
        <div className="absolute inset-x-0 top-0 gap-5 px-6 pt-6" {...frameAttrs(style)} style={style}>
            {children}
        </div>
    );
}

export function SettledBar({
    heard,
    style,
}: {
    heard: Take;
    style?: { buttons?: FrameStyle; heard?: FrameStyle; ori?: FrameStyle };
}) {
    return (
        <div className="absolute inset-x-0 gap-5 px-5" style={{ bottom: MODAL.bottom }}>
            <div className="items-center">
                <OriSprite cell={ORI_CELL.settled} shifted size={ORI_SETTLED} style={style?.ori} />
            </div>
            <HeardSentence style={style?.heard} take={heard} />
            <VoiceButtons style={style?.buttons} />
        </div>
    );
}

export const CAPTION_BOTTOM = MODAL.bottom + ORI_SIZE + 20;

function statusKey(phase: VoicePhase) {
    if (phase === "starting") {
        return "voice.state.starting";
    }
    return phase === "ready" || phase === "listening" ? "voice.state.listening" : "voice.state.thinking";
}

export function voiceLabel(phase: VoicePhase, locale: Locale) {
    const t = appTranslator(locale);
    const { labels } = getIntlayer("appUi", locale);
    const { fix, take } = voiceTake(locale);
    if (phase === "starting" || phase === "ready" || phase === "sending") {
        return interpolate(labels.voiceStatus, { status: t(statusKey(phase)) });
    }
    const words = phase === "listening" ? LISTENING_STILL_WORDS : take.words.length;
    const draft =
        phase === "result" || phase === "corrected"
            ? resolvedDraft(locale, t, phase === "corrected")
            : liveDraft(take, words, locale, t);
    const heard = phase === "corrected" ? fix.heard : take.words.slice(0, words).join(" ");
    if (!draft) {
        return interpolate(labels.voiceHeard, { heard, sentence: "" });
    }
    const said = phase === "corrected" ? "transaction.sentence.when.yesterday" : "transaction.sentence.when.today";
    const when = { ...draft.when, text: t(said) };
    return interpolate(labels.voiceHeard, { heard, sentence: `${draftText({ ...draft, when }, t)}.` });
}

const STILL_CELL: Record<VoicePhase, number> = {
    corrected: ORI_CELL.settled,
    listening: ORI_CELL.listening,
    ready: ORI_CELL.listening,
    result: ORI_CELL.settled,
    sending: ORI_CELL.thinking,
    starting: ORI_CELL.idle,
    thinking: ORI_CELL.thinking,
};

function stillDraft(phase: VoicePhase, take: Take, words: number, locale: Locale, t: AppT) {
    if (phase === "result" || phase === "corrected") {
        return resolvedDraft(locale, t, phase === "corrected");
    }
    if (phase === "listening" || phase === "thinking") {
        return liveDraft(take, words, locale, t);
    }
    return null;
}

function VoiceStill({ phase }: { phase: VoicePhase }) {
    const { locale, t } = useReplica();
    const { fix, take } = voiceTake(locale);
    const settled = phase === "result" || phase === "corrected";
    const words = phase === "listening" ? LISTENING_STILL_WORDS : take.words.length;
    const saying = phase === "listening" || phase === "thinking";
    const draft = stillDraft(phase, take, words, locale, t);
    const waiting = phase === "sending" || phase === "thinking";
    const status = draft === null || waiting ? t(statusKey(phase)) : null;
    return (
        <ModalBody>
            <VoiceContent>
                {draft ? <VoiceSentence draft={draft} /> : null}
                {status ? <StatusLine>{status}</StatusLine> : null}
                {phase === "ready" ? <Hint /> : null}
            </VoiceContent>
            {settled ? (
                <SettledBar heard={phase === "corrected" ? fix : take} />
            ) : (
                <>
                    {saying ? (
                        <div className="absolute inset-x-0 px-5" style={{ bottom: CAPTION_BOTTOM }}>
                            <LiveCaption caret={phase === "listening"} take={take} words={words} />
                        </div>
                    ) : null}
                    <div className="absolute inset-x-0 items-center" style={{ bottom: MODAL.bottom }}>
                        <OriSprite cell={STILL_CELL[phase]} shifted={waiting} />
                    </div>
                </>
            )}
        </ModalBody>
    );
}

export interface VoiceScreenProps extends CanvasProps {
    phase: VoicePhase;
}

export function VoiceScreen({ phase, ...canvas }: VoiceScreenProps) {
    return (
        <AppScreen {...canvas} label={voiceLabel(phase, canvas.locale)}>
            <ModalBackdrop />
            <VoiceStill phase={phase} />
        </AppScreen>
    );
}
