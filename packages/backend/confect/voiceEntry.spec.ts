import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { AudioClip, CurrencyCode, IsoDay, LanguageTag, withinNameBudget } from "./lib/captureArgs";
import { CaptureAdmission } from "./receiptScan.spec";
import type { listTurns } from "./voiceEntry";

export const SpeakStatus = Schema.Literals([
    "ok",
    "unauthenticated",
    "notConfigured",
    "rateLimited",
    "notEntitled",
    "quotaExceeded",
    "invalid",
    "providerError",
    /** No words heard; nothing was written to the thread. */
    "unclear",
]);

export type SpeakStatus = typeof SpeakStatus.Type;

// A privacy boundary: the clip plus only what the model needs in this ledger's terms. No ids, balances or history.
const ledgerArgs = {
    accounts: Schema.Array(Schema.String),
    aiConsent: Schema.optional(Schema.Number),
    categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
    currency: Schema.String,
    language: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    threadId: Schema.String,
    /** `YYYY-MM-DD` in the device's local calendar. */
    today: Schema.String,
};

export const voiceEntryArgs = {
    ...ledgerArgs,
    /** AAC in an MP4 container, as the client records it. */
    audio: Schema.instanceOf(ArrayBuffer),
};

export const MAX_TRANSCRIPT_LENGTH = 1000;

export const speakTextArgs = { ...ledgerArgs, transcript: Schema.String };

const checkedLedgerFields = {
    currency: CurrencyCode,
    language: Schema.optional(LanguageTag),
    today: IsoDay,
};

export const VoiceEntryInput = Schema.Struct({
    ...voiceEntryArgs,
    ...checkedLedgerFields,
    audio: AudioClip,
}).check(withinNameBudget);

export const SpeakTextInput = Schema.Struct({
    ...speakTextArgs,
    ...checkedLedgerFields,
    transcript: Schema.String.check(Schema.isMaxLength(MAX_TRANSCRIPT_LENGTH)),
}).check(withinNameBudget);

export const openStreamArgs = {
    aiConsent: Schema.optional(Schema.Number),
    shareAnalytics: Schema.optional(Schema.Boolean),
    threadId: Schema.String,
};

export const OpenStreamResult = Schema.Struct({
    status: SpeakStatus,
    /** Single-use, valid 15 minutes: the phone opens the ElevenLabs realtime socket with it. */
    token: Schema.NullOr(Schema.String),
});

export type OpenStreamResult = typeof OpenStreamResult.Type;

export const SpeakResult = Schema.Struct({
    /** The turn the transcript landed on; the draft answers at the same order. */
    order: Schema.NullOr(Schema.Number),
    status: SpeakStatus,
    transcript: Schema.NullOr(Schema.String),
});

export type SpeakResult = typeof SpeakResult.Type;

export const StartThreadResult = Schema.Struct({
    status: Schema.Literals(["ok", "unauthenticated", "rateLimited"]),
    threadId: Schema.NullOr(Schema.String),
});

export type StartThreadResult = typeof StartThreadResult.Type;

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({ args: () => ({}), name: "startThread", returns: () => StartThreadResult })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ threadId: Schema.String }),
            name: "expireThread",
            returns: () => Schema.Null,
        })
    )
    .addFunction(FunctionSpec.convexPublicQuery<typeof listTurns>()("listTurns"))
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ threadId: Schema.String }),
            name: "endThread",
            returns: () => Schema.Null,
        })
    )
    .addFunction(FunctionSpec.internalMutation({ args: () => ({}), name: "admit", returns: () => CaptureAdmission }))
    .addFunction(FunctionSpec.publicAction({ args: () => voiceEntryArgs, name: "speak", returns: () => SpeakResult }))
    .addFunction(
        FunctionSpec.publicAction({ args: () => openStreamArgs, name: "openStream", returns: () => OpenStreamResult })
    )
    .addFunction(
        FunctionSpec.publicAction({ args: () => speakTextArgs, name: "speakText", returns: () => SpeakResult })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ threadId: Schema.String }),
            name: "grantStream",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ threadId: Schema.String }),
            name: "spendStream",
            returns: () => Schema.Boolean,
        })
    );
