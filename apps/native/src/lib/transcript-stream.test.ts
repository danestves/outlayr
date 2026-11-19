import { describe, expect, it } from "vite-plus/test";

import { readOpenAiEvent } from "./realtime-openai";
import { readScribeMessage, scribeUrl } from "./realtime-scribe";
import { hear, heardText, NOTHING_HEARD } from "./transcript-stream";
import type { Heard, TranscriptEvent } from "./transcript-stream";

const failureOf = (event: TranscriptEvent | null) => (event?.kind === "failed" ? event.error.reason : null);

const play = (events: (TranscriptEvent | null)[]) =>
    events.reduce<Heard>(
        (heard, event) => (event === null || event.kind === "failed" ? heard : hear(heard, event)),
        NOTHING_HEARD
    );

describe("readScribeMessage", () => {
    it("reads partials as the whole segment so far and commits as final", () => {
        const heard = play([
            readScribeMessage(JSON.stringify({ message_type: "session_started", session_id: "s" })),
            readScribeMessage(JSON.stringify({ message_type: "partial_transcript", text: "twelve" })),
            readScribeMessage(JSON.stringify({ message_type: "partial_transcript", text: "twelve fifty" })),
        ]);
        expect(heardText(heard)).toBe("twelve fifty");
        const done = play([
            readScribeMessage(JSON.stringify({ message_type: "partial_transcript", text: "twelve fifty" })),
            readScribeMessage(JSON.stringify({ message_type: "committed_transcript", text: " twelve fifty at Lidl " })),
        ]);
        expect(done).toStrictEqual({ committed: ["twelve fifty at Lidl"], inProgress: "" });
    });

    it("maps the provider's errors onto the reasons the screen shows", () => {
        const read = (type: string) => failureOf(readScribeMessage(JSON.stringify({ error: "x", message_type: type })));
        expect(read("quota_exceeded")).toBe("quotaExceeded");
        expect(read("insufficient_audio_activity")).toBe("silent");
        expect(read("auth_error")).toBe("unauthenticated");
        expect(read("transcriber_error")).toBe("provider");
    });

    it("ignores frames it does not know", () => {
        expect(readScribeMessage("not json")).toBeNull();
        expect(readScribeMessage(JSON.stringify({ message_type: "something_new" }))).toBeNull();
    });

    it("asks the relay for the model the server chose", () => {
        const url = new URL(scribeUrl({ language: "es", model: "scribe_v4_live", token: "t" }));
        expect(url.searchParams.get("model_id")).toBe("scribe_v4_live");
        expect(url.searchParams.getAll("secondary_languages")).not.toContain("es");
    });
});

describe("readOpenAiEvent", () => {
    it("adds deltas up into the segment in progress, then takes the completed transcript", () => {
        const delta = (text: string) =>
            readOpenAiEvent(
                JSON.stringify({ delta: text, item_id: "i", type: "conversation.item.input_audio_transcription.delta" })
            );
        const heard = play([
            readOpenAiEvent(JSON.stringify({ session: {}, type: "session.created" })),
            delta("Twelve"),
            delta(" fifty"),
        ]);
        expect(heardText(heard)).toBe("Twelve fifty");
        const completed = readOpenAiEvent(
            JSON.stringify({
                item_id: "i",
                transcript: "Twelve fifty at Lidl.",
                type: "conversation.item.input_audio_transcription.completed",
            })
        );
        expect(completed).toStrictEqual({ kind: "committed", text: "Twelve fifty at Lidl." });
    });

    it("maps errors by code, then by type, and anything else to provider", () => {
        const error = (fields: Record<string, string>) =>
            failureOf(readOpenAiEvent(JSON.stringify({ error: { message: "m", ...fields }, type: "error" })));
        expect(error({ code: "input_audio_buffer_commit_empty", type: "invalid_request_error" })).toBe("silent");
        expect(error({ code: "insufficient_quota", type: "insufficient_quota" })).toBe("quotaExceeded");
        expect(error({ type: "authentication_error" })).toBe("unauthenticated");
        expect(error({ type: "server_error" })).toBe("provider");
        const failed = readOpenAiEvent(
            JSON.stringify({ item_id: "i", type: "conversation.item.input_audio_transcription.failed" })
        );
        expect(failureOf(failed)).toBe("provider");
    });
});
