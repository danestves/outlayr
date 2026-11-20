import type { VoiceDraft, VoiceQuote } from "@outlayr/backend/confect/lib/voiceDraft";
import type { SpeakStatus } from "@outlayr/backend/confect/voiceEntry.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Schema from "effect/Schema";

import { convexClient } from "./convex";
import { openMicrophone, openScribeStream, ScribeError } from "./voice-capture";
import type { MicFailure, Microphone, ScribeFailure, ScribeStream } from "./voice-capture";
import { answerAt, judgeSilence, startSilenceWatch } from "./voice-entry";
import type { PromptLedger, SilenceWatch } from "./voice-entry";

export type VoiceFailure =
    | MicFailure
    | ScribeFailure
    | "notConfigured"
    | "notEntitled"
    | "quotaExceeded"
    | "rateLimited"
    | "timeout"
    | "unclear";

export type VoicePhase =
    | { kind: "idle" }
    | { kind: "starting" }
    | { kind: "listening"; partial: string }
    | { kind: "sending"; text: string | null }
    | {
          at: number;
          draft: VoiceDraft;
          heard: string;
          kind: "review";
          quotes: readonly VoiceQuote[];
          sent: PromptLedger;
      }
    | { heard: string | null; kind: "failed"; reason: VoiceFailure };

/** What the model is told about the ledger, read when a take is sent so it matches the books of that moment. */
export interface VoiceRequest {
    currency: string;
    language: string;
    ledger: PromptLedger;
    today: string;
}

const STREAM_TIMEOUT_MS = 10_000;
const SPEAK_TIMEOUT_MS = 25_000;
const TURNS_PAGE = 40;

type Refusal = Exclude<SpeakStatus, "ok">;

const FAILURE_FOR = {
    invalid: "provider",
    notConfigured: "notConfigured",
    notEntitled: "notEntitled",
    providerError: "provider",
    quotaExceeded: "quotaExceeded",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
    unclear: "silent",
} as const satisfies Record<Refusal, VoiceFailure>;

class VoiceTimeoutError extends Schema.TaggedError<VoiceTimeoutError>()("VoiceTimeoutError", {
    message: Schema.String,
}) {}

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer = 0;
    const late = new Promise<never>((_resolve, reject) => {
        timer = window.setTimeout(() => reject(new VoiceTimeoutError({ message: "The request took too long." })), ms);
    });
    return Promise.race([promise, late]).finally(() => window.clearTimeout(timer));
}

const offline = () => globalThis.navigator?.onLine === false;

export interface VoiceTransport {
    endThread: (threadId: string) => Promise<null>;
    openStream: (threadId: string) => Promise<{ status: SpeakStatus; token: string | null }>;
    speakText: (
        threadId: string,
        transcript: string,
        request: VoiceRequest
    ) => Promise<{ order: number | null; status: SpeakStatus }>;
    startThread: () => Promise<{ status: string; threadId: string | null }>;
    /** Resolves with the assistant's answer to the turn at `order` once the thread holds it. */
    answer: (threadId: string, order: number) => Promise<ReturnType<typeof answerAt>>;
}

export const convexVoiceTransport = (): VoiceTransport => ({
    answer: (threadId, order) =>
        new Promise((resolve) => {
            const watch = convexClient().watchQuery(api.voiceEntry.listTurns, {
                paginationOpts: { cursor: null, numItems: TURNS_PAGE },
                threadId,
            });
            const settle = () => {
                const turns = watch.localQueryResult();
                const answer = turns === undefined ? { kind: "pending" as const } : answerAt(turns.page, order);
                if (answer.kind === "pending") {
                    return false;
                }
                resolve(answer);
                return true;
            };
            if (settle()) {
                return;
            }
            const stop = watch.onUpdate(() => {
                if (settle()) {
                    stop();
                }
            });
        }),
    endThread: (threadId) => convexClient().mutation(api.voiceEntry.endThread, { threadId }),
    openStream: (threadId) =>
        convexClient().action(api.voiceEntry.openStream, { aiConsent: AI_CONSENT_VERSION, threadId }),
    speakText: (threadId, transcript, request) =>
        convexClient().action(api.voiceEntry.speakText, {
            accounts: request.ledger.accounts,
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: request.ledger.categoryTree,
            currency: request.currency,
            language: request.language,
            threadId,
            today: request.today,
            transcript,
        }),
    startThread: () => convexClient().mutation(api.voiceEntry.startThread, {}),
});

interface Take {
    id: number;
    mic: Microphone | null;
    stream: ScribeStream | null;
    watch: SilenceWatch | null;
}

/**
 * One voice sheet's takes on one thread, as the phone's `useVoiceEntry` runs them: the microphone first, then a
 * single-use token, then the relay socket, then the transcript into the thread and the drafted answer back.
 */
export function createVoiceTake(transport: VoiceTransport, request: () => VoiceRequest) {
    let phase: VoicePhase = { kind: "idle" };
    let threadId: string | null = null;
    let take: Take = { id: 0, mic: null, stream: null, watch: null };
    const listeners = new Set<() => void>();

    const set = (next: VoicePhase) => {
        phase = next;
        for (const listener of listeners) {
            listener();
        }
    };
    const current = (id: number) => take.id === id;
    const fail = (id: number, reason: VoiceFailure, heard: string | null = null) => {
        if (current(id)) {
            set({ heard, kind: "failed", reason });
        }
    };
    const release = (stale: Take) => {
        stale.watch = null;
        stale.mic?.stop();
        stale.stream?.close();
    };
    const dropThread = () => {
        const id = threadId;
        threadId = null;
        if (id !== null) {
            void transport.endThread(id).catch(() => undefined);
        }
    };
    const openThread = async (id: number) => {
        if (threadId !== null) {
            return threadId;
        }
        const opened = await transport.startThread();
        if (opened.status !== "ok" || opened.threadId === null) {
            fail(id, opened.status === "rateLimited" ? "rateLimited" : "unauthenticated");
            return null;
        }
        if (!current(id)) {
            void transport.endThread(opened.threadId).catch(() => undefined);
            return null;
        }
        const { threadId: started } = opened;
        threadId = started;
        return started;
    };
    const openToken = async (id: number, retried = false): Promise<string | null> => {
        const thread = await openThread(id);
        if (thread === null || !current(id)) {
            return null;
        }
        const opened = await within(transport.openStream(thread), STREAM_TIMEOUT_MS);
        if (!current(id)) {
            return null;
        }
        if (opened.status === "ok" && opened.token !== null) {
            return opened.token;
        }
        // The server sweeps threads idle for an hour: reopen once on a fresh thread.
        if (opened.status === "invalid" && !retried) {
            dropThread();
            return openToken(id, true);
        }
        fail(id, opened.status === "ok" ? "provider" : FAILURE_FOR[opened.status]);
        return null;
    };

    const send = async (id: number, text: string, resent = false): Promise<void> => {
        const thread = await openThread(id);
        if (thread === null || !current(id)) {
            return;
        }
        const sent = request();
        const spoken = await within(transport.speakText(thread, text, sent), SPEAK_TIMEOUT_MS);
        if (!current(id)) {
            return;
        }
        if (spoken.status === "invalid" && !resent) {
            dropThread();
            return send(id, text, true);
        }
        if (spoken.status !== "ok" || spoken.order === null) {
            fail(id, spoken.status === "ok" ? "provider" : FAILURE_FOR[spoken.status], text);
            return;
        }
        const answer = await within(transport.answer(thread, spoken.order), SPEAK_TIMEOUT_MS);
        if (!current(id)) {
            return;
        }
        if (answer.kind !== "proposed") {
            fail(id, "provider", text);
            return;
        }
        if (answer.proposed.draft === null) {
            fail(id, "unclear", text);
            return;
        }
        set({
            at: Date.now(),
            draft: answer.proposed.draft,
            heard: text,
            kind: "review",
            quotes: answer.proposed.quotes ?? [],
            sent: sent.ledger,
        });
    };

    const guarded = async (id: number, flow: () => Promise<void>, heard: () => string | null = () => null) => {
        try {
            await flow();
        } catch (error) {
            release(take.id === id ? take : { id, mic: null, stream: null, watch: null });
            if (error instanceof VoiceTimeoutError) {
                // The request may still land a draft on this thread, so a retry must not speak into it.
                dropThread();
                fail(id, "timeout", heard());
            } else if (error instanceof ScribeError) {
                fail(id, error.reason, heard());
            } else {
                fail(id, offline() ? "offline" : "provider", heard());
            }
        }
    };

    const finish = () => {
        if (phase.kind !== "listening") {
            return;
        }
        const ending = take;
        const { mic, stream } = ending;
        ending.watch = null;
        mic?.stop();
        set({ kind: "sending", text: null });
        let heard: string | null = null;
        void guarded(
            ending.id,
            async () => {
                const said = await stream?.finish();
                const text = said?.trim() ?? "";
                stream?.close();
                if (!current(ending.id)) {
                    return;
                }
                if (text === "") {
                    fail(ending.id, "silent");
                    return;
                }
                heard = text;
                set({ kind: "sending", text });
                await send(ending.id, text);
            },
            () => heard
        );
    };

    const hear = (id: number, level: number) => {
        if (!current(id) || take.watch === null) {
            return;
        }
        const judged = judgeSilence(take.watch, level, Date.now());
        take.watch = judged.watch;
        if (judged.verdict === "nothingSaid") {
            release(take);
            fail(id, "silent");
        } else if (judged.verdict !== "keep") {
            finish();
        }
    };

    const start = () => {
        release(take);
        take = { id: take.id + 1, mic: null, stream: null, watch: null };
        const mine = take;
        set({ kind: "starting" });
        void guarded(mine.id, async () => {
            const opened = await openMicrophone();
            if (!current(mine.id)) {
                if (opened.ok) {
                    opened.mic.stop();
                }
                return;
            }
            if (!opened.ok) {
                fail(mine.id, opened.reason);
                return;
            }
            mine.mic = opened.mic;
            const token = await openToken(mine.id);
            if (token === null || !current(mine.id)) {
                release(mine);
                return;
            }
            mine.stream = openScribeStream({
                language: request().language,
                onError: (error) => {
                    if (current(mine.id) && phase.kind === "listening") {
                        release(mine);
                        fail(mine.id, error.reason);
                    }
                },
                onPartial: (partial) => {
                    if (current(mine.id) && phase.kind === "listening") {
                        set({ kind: "listening", partial });
                    }
                },
                token,
            });
            mine.watch = startSilenceWatch(Date.now());
            set({ kind: "listening", partial: "" });
            opened.mic.listen((pcm, level) => {
                mine.stream?.send(pcm);
                hear(mine.id, level);
            });
        });
    };

    return {
        /** Ends the take and its microphone; the thread stays for a correction. */
        cancel: () => {
            release(take);
            take = { id: take.id + 1, mic: null, stream: null, watch: null };
            set({ kind: "idle" });
        },
        /** Closes the sheet: the take, the microphone and the server thread. */
        dispose: () => {
            release(take);
            take = { id: take.id + 1, mic: null, stream: null, watch: null };
            dropThread();
            phase = { kind: "idle" };
        },
        finish,
        /** A saved entry starts the next one on a fresh thread, so the model does not read it as a correction. */
        fresh: () => {
            dropThread();
            start();
        },
        snapshot: () => phase,
        start,
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export type VoiceTake = ReturnType<typeof createVoiceTake>;
