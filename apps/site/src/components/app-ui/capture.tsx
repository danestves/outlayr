import "./capture.css";
import type { CSSProperties, ReactNode } from "react";

import { AppScreen, useLedger, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import {
    MODAL,
    ModalBackdrop,
    ModalBody,
    ORI_SETTLED,
    ORI_SIZE,
    OriSprite,
    frameAttrs,
    frameTimes,
} from "./capture-parts";
import type { FrameStyle } from "./capture-parts";
import { FILM_SECONDS } from "./capture-timing";
import type { CaptureWay } from "./capture-timing";
import { NewEntrySheet, sheetLabel } from "./entry";
import { entryStates } from "./entry-state";
import type { EntryState, EntryStates } from "./entry-state";
import { letterKeyAt } from "./keyboard";
import { DEMO_NOW } from "./ledger";
import { ScanIntro, ScanReading, ScanReview, scanLabel } from "./scan";
import {
    CAPTION_BOTTOM,
    HeardSentence,
    Hint,
    LiveCaption,
    StatusLine,
    VoiceButtons,
    VoiceSentence,
    draftText,
    liveDraft,
    resolvedDraft,
    voiceLabel,
    voiceTake,
} from "./voice";

const QUICK = 0.12;

interface Beat {
    readonly at: number;
    readonly node: ReactNode;
    readonly over?: boolean;
}

function beatStyles(beats: readonly Beat[], fade: number, first = fade) {
    return beats.map((beat, index) => {
        const next = beats[index + 1];
        const enter = index === 0 ? first : fade;
        if (next === undefined) {
            return frameTimes(beat.at, undefined, enter);
        }
        if (next.over) {
            return frameTimes(beat.at, next.at + fade, enter, 0);
        }
        return frameTimes(beat.at, next.at, enter, fade === 0 ? 0 : undefined);
    });
}

function Beats({
    beats,
    className,
    fade,
    first,
}: {
    beats: readonly Beat[];
    className: string;
    fade: number;
    first?: number;
}) {
    const styles = beatStyles(beats, fade, first);
    return beats.map((beat, index) => {
        const style = styles[index];
        return (
            <div className={className} key={beat.at} {...frameAttrs(style)} style={style}>
                {beat.node}
            </div>
        );
    });
}

function Film({ children, way }: { children: ReactNode; way: CaptureWay }) {
    const style: FrameStyle = { "--film": `${FILM_SECONDS[way]}s` };
    return (
        <div className="absolute inset-0" data-film={way} style={style}>
            {children}
        </div>
    );
}

const KEY_PRESS = 0.1;
const PAD_KEY = { height: 48, radius: 12, width: 115.33 } as const;
const PAD_COLUMNS = [20, 143.33, 266.67] as const;
const PAD_ROWS = [560, 616, 672, 728] as const;
const LETTER_KEY = { height: 43, radius: 8.5, width: 32.33 } as const;

interface Press {
    readonly at: number;
    readonly box: CSSProperties;
}

const padKey = (row: number, column: number): CSSProperties => ({
    borderRadius: PAD_KEY.radius,
    height: PAD_KEY.height,
    left: PAD_COLUMNS[column],
    top: PAD_ROWS[row],
    width: PAD_KEY.width,
});

const letterKey = (char: string): CSSProperties | undefined => {
    const origin = letterKeyAt(char);
    return (
        origin && {
            borderRadius: LETTER_KEY.radius,
            height: LETTER_KEY.height,
            width: LETTER_KEY.width,
            ...origin,
        }
    );
};

const PAD_LAYOUT = ["123", "456", "789", ".0"] as const;
const DIGIT_STEP = 0.15;
const FIRST_DIGIT_AT = 0.2;
const LAST_DIGIT_AT = 0.95;
const LETTER_BEATS = [2.1, 2.4] as const;

function digitKey(digit: string): CSSProperties | undefined {
    for (const [row, keys] of PAD_LAYOUT.entries()) {
        if (keys.includes(digit)) {
            return padKey(row, keys.indexOf(digit));
        }
    }
    return undefined;
}

interface TypeBeat {
    readonly at: number;
    readonly press?: CSSProperties;
    readonly state: EntryState;
}

function typeBeats(states: EntryStates): readonly TypeBeat[] {
    const digits = [...states.NUMPAD.amount];
    const letters = [...states.NAME_CHIPS.name];
    const step = Math.min(DIGIT_STEP, (LAST_DIGIT_AT - FIRST_DIGIT_AT) / Math.max(digits.length - 1, 1));
    return [
        ...digits.map((digit, index) => ({
            at: LAST_DIGIT_AT - (digits.length - 1 - index) * step,
            press: digitKey(digit),
            state: { ...states.EMPTY, amount: digits.slice(0, index + 1).join("") },
        })),
        { at: 1.6, state: states.NAME },
        ...letters.map((letter, index) => ({
            at: LETTER_BEATS[index] ?? LETTER_BEATS[1],
            press: letterKey(letter),
            state: { ...states.NAME, name: letters.slice(0, index + 1).join("") },
        })),
        { at: 3.2, state: states.CATEGORY },
        { at: 4.2, state: states.ACCOUNT },
        { at: 5.1, state: states.FILLED },
    ];
}

function KeyPress({ press }: { press: Press }) {
    const style: FrameStyle = { ...press.box, "--in": `${press.at}s` };
    return <div className="absolute" data-flash="" style={style} />;
}

export function TypeFilm(canvas: CanvasProps) {
    const ledger = useLedger();
    const states = entryStates(ledger);
    return (
        <AppScreen {...canvas} label={sheetLabel(ledger, states.FILLED, DEMO_NOW, canvas.locale, "typeFilm")}>
            <Film way="type">
                <NewEntrySheet now={DEMO_NOW} state={states.EMPTY} />
                {typeBeats(states).map((beat) => {
                    const style = frameTimes(beat.at, undefined, QUICK);
                    return (
                        <div className="contents" key={beat.at}>
                            {beat.press ? <KeyPress press={{ at: beat.at - KEY_PRESS, box: beat.press }} /> : null}
                            <div className="absolute inset-0" {...frameAttrs(style)} style={style}>
                                <NewEntrySheet backdrop={false} now={DEMO_NOW} state={beat.state} />
                            </div>
                        </div>
                    );
                })}
            </Film>
        </AppScreen>
    );
}

const SAY = { first: 1.3, last: 4.3, ready: 0.7, result: 6.5, sending: 4.9 } as const;
const SETTLE = { buttons: 6.95, happy: 6.83, heard: 7.13, step: 0.033 } as const;
const LIT_CELLS = [22, 23, 24, 25] as const;
const HAPPY_FIRST = 26;
const HAPPY_LAST = 39;
const ORI_IDLE = 0;
const ORI_LISTENING = 3;
const ORI_THINKING = 19;

function SayBody() {
    const { ledger, locale, t } = useReplica();
    const { take } = voiceTake(ledger, locale);
    const count = take.words.length;
    const step = (SAY.last - SAY.first) / Math.max(count - 1, 1);
    const wordAt = (words: number) => SAY.first + (words - 1) * step;
    const words = Array.from({ length: count }, (_, index) => index + 1);

    const content: Beat[] = [
        { at: 0, node: <StatusLine>{t("voice.state.starting")}</StatusLine> },
        {
            at: SAY.ready,
            node: (
                <>
                    <StatusLine>{t("voice.state.listening")}</StatusLine>
                    <Hint />
                </>
            ),
        },
    ];
    let shown = "";
    for (const heard of words) {
        const draft = liveDraft(take, heard, ledger, locale, t);
        const key = draft ? draftText(draft, t) : "";
        if (heard > 1 && key === shown) {
            continue;
        }
        content.push({
            at: wordAt(heard),
            node: draft ? <VoiceSentence draft={draft} /> : <StatusLine>{t("voice.state.listening")}</StatusLine>,
            over: shown !== "" && draft !== null,
        });
        shown = key;
    }
    const spoken = liveDraft(take, count, ledger, locale, t);
    content.push(
        {
            at: SAY.sending,
            node: (
                <>
                    {spoken ? <VoiceSentence draft={spoken} /> : null}
                    <StatusLine>{t("voice.state.thinking")}</StatusLine>
                </>
            ),
        },
        { at: SAY.result, node: <VoiceSentence draft={resolvedDraft(ledger, locale, t, false)} /> }
    );

    const captions: Beat[] = [
        ...words.map((heard) => ({
            at: wordAt(heard),
            node: <LiveCaption caret take={take} words={heard} />,
            over: heard > 1,
        })),
        { at: SAY.sending, node: <LiveCaption caret={false} take={take} words={count} />, over: true },
        { at: SAY.result, node: null },
    ];

    const oriBeats: Beat[] = [
        { at: 0, node: <OriSprite cell={ORI_IDLE} shifted={false} /> },
        { at: SAY.ready, node: <OriSprite cell={ORI_LISTENING} shifted={false} /> },
        { at: SAY.sending, node: <OriSprite cell={ORI_THINKING} shifted /> },
        ...LIT_CELLS.map((cell, index) => ({
            at: SAY.result + (index * (SETTLE.happy - SAY.result)) / LIT_CELLS.length,
            node: <OriSprite cell={cell} shifted />,
        })),
        { at: SETTLE.happy, node: null },
    ];

    const happy: Beat[] = Array.from({ length: HAPPY_LAST - HAPPY_FIRST + 1 }, (_, index) => ({
        at: SETTLE.happy + index * SETTLE.step,
        node: <OriSprite cell={HAPPY_FIRST + index} shifted size={ORI_SETTLED} />,
    }));

    return (
        <ModalBody>
            <Beats beats={content} className="absolute inset-x-0 top-0 gap-5 px-6 pt-6" fade={QUICK} first={0} />
            <div className="absolute inset-x-0" style={{ bottom: CAPTION_BOTTOM }}>
                <Beats beats={captions} className="absolute inset-x-0 bottom-0 px-5" fade={QUICK} />
            </div>
            <div className="absolute inset-x-0" style={{ bottom: MODAL.bottom, height: ORI_SIZE }}>
                <Beats beats={oriBeats} className="absolute inset-0 items-center" fade={0} />
            </div>
            <div className="absolute inset-x-0 gap-5 px-5" style={{ bottom: MODAL.bottom }}>
                <div className="items-center" style={{ height: ORI_SETTLED }}>
                    <Beats beats={happy} className="absolute inset-x-0 top-0 items-center" fade={0} />
                </div>
                <HeardSentence style={frameTimes(SETTLE.heard)} take={take} />
                <VoiceButtons style={frameTimes(SETTLE.buttons)} />
            </div>
        </ModalBody>
    );
}

export function SayFilm(canvas: CanvasProps) {
    const ledger = useLedger();
    return (
        <AppScreen {...canvas} label={voiceLabel("result", ledger, canvas.locale)}>
            <ModalBackdrop />
            <Film way="say">
                <SayBody />
            </Film>
        </AppScreen>
    );
}

const SNAP = { reading: 1.5, review: 5 } as const;
const STAGE_FADE = 0.26;
const REVIEW_FADE = 0.2;

export function SnapFilm(canvas: CanvasProps) {
    const ledger = useLedger();
    return (
        <AppScreen {...canvas} label={scanLabel("review", ledger, canvas.locale)}>
            <ModalBackdrop />
            <Film way="snap">
                <ScanIntro style={frameTimes(0, SNAP.reading, 0)} />
                <ScanReading
                    style={frameTimes(SNAP.reading, SNAP.review, STAGE_FADE)}
                    sweep={{ "--in": `${SNAP.reading}s` }}
                />
                <ScanReview enter={SNAP.review} style={frameTimes(SNAP.review, undefined, REVIEW_FADE)} />
            </Film>
        </AppScreen>
    );
}
