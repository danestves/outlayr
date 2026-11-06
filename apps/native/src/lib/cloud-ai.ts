import { CsvImportResult } from "@outlayr/backend/confect/csvImport.spec";
import type { CsvImportStatus, LabelSuggestion } from "@outlayr/backend/confect/csvImport.spec";
import { InstallmentScanResult } from "@outlayr/backend/confect/installmentScan.spec";
import type { InstallmentPlanDraft as InstallmentPlanDraftSchema } from "@outlayr/backend/confect/installmentScan.spec";
import { PDF_CONTENT_TYPE, PdfImportResult, UploadTicket } from "@outlayr/backend/confect/pdfImport.spec";
import type { PdfImportStatus, StatementRow } from "@outlayr/backend/confect/pdfImport.spec";
import { ScanResult } from "@outlayr/backend/confect/receiptScan.spec";
import type {
    ReceiptDraft as ReceiptDraftSchema,
    ReceiptItem as ReceiptItemSchema,
    ScanStatus as ScanStatusSchema,
} from "@outlayr/backend/confect/receiptScan.spec";
import type { PROPOSE_DRAFT_TOOL as SERVER_DRAFT_TOOL } from "@outlayr/backend/confect/voiceEntry";
import { SpeakResult, StartThreadResult } from "@outlayr/backend/confect/voiceEntry.spec";
import type { SpeakStatus } from "@outlayr/backend/confect/voiceEntry.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { CloudError } from "./cloud-error";
import { aiConsentArgs, cloudAction, cloudMutation } from "./convex";
import type { CategoryBranch } from "./convex";

export type { LabelSuggestion } from "@outlayr/backend/confect/csvImport.spec";
export type { ProposedDraft, VoiceDraft, VoiceQuote, VoiceRecurrence } from "@outlayr/backend/confect/voiceEntry";

export type ReceiptDraft = typeof ReceiptDraftSchema.Type;

export type ReceiptItem = typeof ReceiptItemSchema.Type;

export type ScanStatus = typeof ScanStatusSchema.Type;

export type InstallmentPlanDraft = typeof InstallmentPlanDraftSchema.Type;

export type InstallmentPlanRow = InstallmentPlanDraft["rows"][number];

const INVALID_RESPONSE = { ok: false, reason: "invalidResponse" } as const;

export type ScanRefusal = Exclude<ScanStatus, "ok">;

export type ScanOutcome<Draft> =
    | { readonly draft: Draft; readonly ok: true }
    | { readonly ok: false; readonly reason: ScanRefusal };

function scanOutcome<Draft>(status: ScanStatus, draft: Draft | null): ScanOutcome<Draft> {
    if (status !== "ok") {
        return { ok: false, reason: status };
    }
    return draft === null ? INVALID_RESPONSE : { draft, ok: true };
}

export interface ScanRequest {
    accounts: string[];
    categoryTree: CategoryBranch[];
    currency: string;
    /** JPEG, under `MAX_IMAGE_BYTES` on the server. */
    image: ArrayBuffer;
    language?: string;
    regionCode?: string;
    today: string;
}

export type ReceiptScanFn = (args: ScanRequest) => Effect.Effect<ScanOutcome<ReceiptDraft>, CloudError>;

const decodeScanResult = Schema.decodeUnknownOption(ScanResult);

export function receiptScanTransport(): ReceiptScanFn {
    return (args) =>
        cloudAction(api.receiptScan.scan, { ...args, ...aiConsentArgs() }).pipe(
            Effect.map((reply) =>
                Option.match(decodeScanResult(reply), {
                    onNone: () => INVALID_RESPONSE,
                    onSome: ({ receipt, status }) => scanOutcome(status, receipt),
                })
            )
        );
}

export type InstallmentScanRequest = Omit<ScanRequest, "categoryTree">;

export type InstallmentScanFn = (
    args: InstallmentScanRequest
) => Effect.Effect<ScanOutcome<InstallmentPlanDraft>, CloudError>;

const decodeInstallmentScanResult = Schema.decodeUnknownOption(InstallmentScanResult);

export function installmentScanTransport(): InstallmentScanFn {
    return (args) =>
        cloudAction(api.installmentScan.scan, { ...args, ...aiConsentArgs() }).pipe(
            Effect.map((reply) =>
                Option.match(decodeInstallmentScanResult(reply), {
                    onNone: () => INVALID_RESPONSE,
                    onSome: ({ plan, status }) => scanOutcome(status, plan),
                })
            )
        );
}

export interface CsvImportRequest {
    categoryTree: CategoryBranch[];
    groundedLookup?: boolean;
    labels: string[];
    regionCode?: string;
}

export type CsvImportRefusal = Exclude<CsvImportStatus, "ok">;

export type CsvImportOutcome =
    | { readonly ok: true; readonly suggestions: readonly LabelSuggestion[] }
    | { readonly ok: false; readonly reason: CsvImportRefusal };

export type CsvImportFn = (args: CsvImportRequest) => Effect.Effect<CsvImportOutcome, CloudError>;

const decodeCsvImportResult = Schema.decodeUnknownOption(CsvImportResult);

export function csvImportTransport(): CsvImportFn {
    return (args) =>
        cloudAction(api.csvImport.csvImport, { ...args, ...aiConsentArgs() }).pipe(
            Effect.map((reply) =>
                Option.match(decodeCsvImportResult(reply), {
                    onNone: () => INVALID_RESPONSE,
                    onSome: ({ status, suggestions }): CsvImportOutcome =>
                        status === "ok" ? { ok: true, suggestions: suggestions ?? [] } : { ok: false, reason: status },
                })
            )
        );
}

export type { StatementRow } from "@outlayr/backend/confect/pdfImport.spec";

export interface PdfImportRequest {
    bytes: Uint8Array;
    categoryTree: CategoryBranch[];
    groundedLookup: boolean;
    regionCode?: string;
    today: string;
}

export type PdfImportRefusal = Exclude<PdfImportStatus, "ok">;

export type PdfImportOutcome =
    | {
          readonly complete: boolean;
          readonly ok: true;
          readonly rows: readonly StatementRow[];
          readonly suggestions: readonly LabelSuggestion[];
      }
    | { readonly ok: false; readonly reason: PdfImportRefusal };

const decodeUploadTicket = Schema.decodeUnknownOption(UploadTicket);
const decodePdfImportResult = Schema.decodeUnknownOption(PdfImportResult);
const decodeStorageReceipt = HttpIncomingMessage.schemaBodyJson(Schema.Struct({ storageId: Schema.String }));

const uploadFailed = (cause: Error) => new CloudError({ cause, kind: "upload", path: "pdfImport" });

function pdfImportOutcome({ degraded, rows, status, suggestions }: PdfImportResult): PdfImportOutcome {
    if (status !== "ok") {
        return { ok: false, reason: status };
    }
    return rows === null
        ? INVALID_RESPONSE
        : { complete: degraded !== true, ok: true, rows, suggestions: suggestions ?? [] };
}

export const pdfImport = Effect.fn("Cloud.pdfImport")(function* pdfImport({ bytes, ...args }: PdfImportRequest) {
    const client = yield* HttpClient.HttpClient;
    const ticket = Option.getOrNull(decodeUploadTicket(yield* cloudMutation(api.pdfImport.requestUpload, {})));
    if (ticket === null) {
        return INVALID_RESPONSE;
    }
    if (ticket.status !== "ok") {
        return { ok: false, reason: ticket.status } as const;
    }
    if (ticket.url === null) {
        return INVALID_RESPONSE;
    }
    const uploaded = yield* client
        .execute(HttpClientRequest.post(ticket.url).pipe(HttpClientRequest.bodyUint8Array(bytes, PDF_CONTENT_TYPE)))
        .pipe(
            Effect.flatMap(decodeStorageReceipt),
            Effect.catchTags({
                HttpClientError: (cause) => Effect.fail(uploadFailed(cause)),
                SchemaError: (cause) => Effect.fail(uploadFailed(cause)),
            })
        );
    const reply = yield* cloudAction<unknown, unknown>("pdfImport:extract", {
        ...args,
        ...aiConsentArgs(),
        storageId: uploaded.storageId,
    });
    return Option.match(decodePdfImportResult(reply), { onNone: () => INVALID_RESPONSE, onSome: pdfImportOutcome });
});

export const VOICE_TURNS_QUERY = api.voiceEntry.listTurns;

/** Must match the server's tool name; its UI part is `tool-${name}`. */
export const PROPOSE_DRAFT_TOOL: typeof SERVER_DRAFT_TOOL = "proposeDraft";

export interface SpeakRequest {
    accounts: string[];
    /** AAC in an MP4 container, under `MAX_AUDIO_BYTES` on the server. */
    audio: ArrayBuffer;
    categoryTree: CategoryBranch[];
    currency: string;
    language?: string;
    threadId: string;
    today: string;
}

export type SpeakRefusal = Exclude<SpeakStatus, "ok"> | "invalidResponse";

export type SpeakOutcome =
    | { readonly ok: true; readonly order: number }
    | { readonly ok: false; readonly reason: SpeakRefusal; readonly transcript: string | null };

export type ThreadRefusal = Exclude<StartThreadResult["status"], "ok"> | "invalidResponse";

export type ThreadOutcome =
    | { readonly ok: true; readonly threadId: string }
    | { readonly ok: false; readonly reason: ThreadRefusal };

export interface VoiceThreadTransport {
    end: (threadId: string) => Effect.Effect<null, CloudError>;
    speak: (args: SpeakRequest) => Effect.Effect<SpeakOutcome, CloudError>;
    start: () => Effect.Effect<ThreadOutcome, CloudError>;
}

const decodeSpeakResult = Schema.decodeUnknownOption(SpeakResult);

const decodeStartThreadResult = Schema.decodeUnknownOption(StartThreadResult);

function speakOutcome({ order, status, transcript }: SpeakResult): SpeakOutcome {
    if (status !== "ok") {
        return { ok: false, reason: status, transcript };
    }
    return order === null ? { ok: false, reason: "invalidResponse", transcript } : { ok: true, order };
}

function threadOutcome({ status, threadId }: StartThreadResult): ThreadOutcome {
    if (status !== "ok") {
        return { ok: false, reason: status };
    }
    return threadId === null ? INVALID_RESPONSE : { ok: true, threadId };
}

export function voiceThreadTransport(): VoiceThreadTransport {
    return {
        end: (threadId) => cloudMutation(api.voiceEntry.endThread, { threadId }),
        speak: (args) =>
            cloudAction(api.voiceEntry.speak, { ...args, ...aiConsentArgs() }).pipe(
                Effect.map((reply) =>
                    Option.match(decodeSpeakResult(reply), {
                        onNone: (): SpeakOutcome => ({ ...INVALID_RESPONSE, transcript: null }),
                        onSome: speakOutcome,
                    })
                )
            ),
        start: () =>
            cloudMutation(api.voiceEntry.startThread, {}).pipe(
                Effect.map((reply) =>
                    Option.match(decodeStartThreadResult(reply), {
                        onNone: () => INVALID_RESPONSE,
                        onSome: threadOutcome,
                    })
                )
            ),
    };
}
