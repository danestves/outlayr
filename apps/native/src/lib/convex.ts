import type { StreamArgs, SyncStreamsReturnValue, UIMessage } from "@convex-dev/agent";
import { utcDateString } from "@outlayr/money/dates";
import { makeFunctionReference } from "convex/server";
import type { PaginationOptions, PaginationResult } from "convex/server";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useSyncExternalStore } from "react";

import type { AnsweredJob, EnrichmentJobRequest } from "@/data/enrichment-queue-core";
import type { PhotoTransport } from "@/data/photo-sync-core";
import type { PullRatesFn, RateWireRow } from "@/data/rates";
import type { PullFn, PushFn } from "@/data/sync-engine-core";
import { AI_CONSENT_VERSION } from "@/domain/ai-consent";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import type { UsageLimits } from "@/domain/usage-limits";
import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "@/state/atom-command";
import type { AtomCommand } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";

import { CloudError } from "./cloud-error";
import { cloudRuntime } from "./cloud-runtime";
import type { CloudRuntime } from "./cloud-runtime";

export const convex = cloudRuntime?.convex ?? null;

let authenticated = false;
const authListeners = new Set<() => void>();

export function setCloudAuthenticated(next: boolean): void {
    if (next === authenticated) {
        return;
    }
    authenticated = next;
    for (const listener of authListeners) {
        listener();
    }
}

export function isCloudAuthenticated(): boolean {
    return authenticated;
}

function subscribeCloudAuthenticated(listener: () => void): () => void {
    authListeners.add(listener);
    return () => {
        authListeners.delete(listener);
    };
}

export function useCloudAuthenticated(): boolean {
    return useSyncExternalStore(subscribeCloudAuthenticated, isCloudAuthenticated, isCloudAuthenticated);
}

function cloudClient(): CloudRuntime["convex"] {
    if (cloudRuntime === null) {
        throw new Error("Cloud runtime is not configured");
    }
    return cloudRuntime.convex;
}

function callCloud<Result>(
    kind: "query" | "mutation" | "action",
    path: string,
    run: (client: CloudRuntime["convex"]) => Promise<Result>
) {
    return Effect.tryPromise({
        catch: (cause) => new CloudError({ cause, kind, path }),
        try: () => run(cloudClient()),
    }).pipe(Effect.withSpan("Cloud.call", { attributes: { kind, path } }));
}

/** Addressed by string path: `packages/backend` is not a build dependency, so the generated `api` object is absent. */
export function cloudQuery<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError> {
    // SAFETY: `never` satisfies the generated-API overloads, and the result type is the deployed function's, which
    // this client cannot check.
    return callCloud("query", path, (client) => client.query(path as never, args as never) as Promise<Result>);
}

export function cloudMutation<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError> {
    // SAFETY: as in `cloudQuery`.
    return callCloud("mutation", path, (client) => client.mutation(path as never, args as never) as Promise<Result>);
}

export function cloudAction<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError> {
    // SAFETY: as in `cloudQuery`.
    return callCloud("action", path, (client) => client.action(path as never, args as never) as Promise<Result>);
}

async function runCloud<W, A>(command: AtomCommand<W, A, CloudError>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

/** Rounded to the UTC day so identical args let Convex answer every page and device from its query cache. */
function rateWindowAt(): number {
    return Date.parse(utcDateString(Date.now()));
}

export function ratesPuller(): PullRatesFn {
    return (args) => cloudQuery("exchangeRates:pullRates", { ...args, at: rateWindowAt() });
}

const decodeRateWireRows = Schema.decodeUnknownOption(
    Schema.mutable(
        Schema.Array(
            Schema.Struct({
                date: Schema.String,
                fetchedAt: Schema.Finite,
                quote: Schema.String,
                rate: Schema.Finite,
                rateType: Schema.String,
                source: Schema.String,
            })
        )
    )
);

export function watchRecentRates(onRows: (rows: RateWireRow[]) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    // SAFETY: addressed by path for the reason given on `cloudQuery`.
    const watch = cloudRuntime.convex.watchQuery(
        "exchangeRates:pullRecentRates" as never,
        { at: rateWindowAt() } as never
    );
    return watch.onUpdate(() => {
        let rows: ReturnType<typeof decodeRateWireRows> | null = null;
        try {
            rows = decodeRateWireRows(watch.localQueryResult());
        } catch {
            rows = null;
        }
        if (rows !== null && Option.isSome(rows) && rows.value.length > 0) {
            onRows(rows.value);
        }
    });
}

export interface SyncTransport {
    pull: PullFn;
    push: PushFn;
}

export function syncTransport(): SyncTransport {
    return {
        pull: (args) => cloudQuery("sync:pullSince", args),
        push: (args) => cloudMutation("sync:push", args),
    };
}

const isWatermark = Schema.is(Schema.Finite);

export function watchSyncWatermark(onWatermark: (watermark: number) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    // SAFETY: addressed by path for the reason given on `cloudQuery`.
    const watch = cloudRuntime.convex.watchQuery("sync:currentSeq" as never, {} as never);
    return watch.onUpdate(() => {
        try {
            const watermark = watch.localQueryResult();
            if (isWatermark(watermark)) {
                onWatermark(watermark);
            }
        } catch {
            // Refused while signed out; the same socket delivers a value once a token is set, so stay subscribed.
        }
    });
}

export interface CategoryBranch {
    children: string[];
    name: string;
}

export interface EnrichmentRequest {
    background?: boolean;
    categoryTree: CategoryBranch[];
    currency?: string;
    groundedLookup: boolean;
    income: boolean;
    knowledgeOnly?: boolean;
    locale?: string;
    name: string;
    regionCode?: string;
}

export type EnrichmentFn = (args: EnrichmentRequest) => Promise<RemoteEnrichmentResult>;

const enrichmentCommand = createCommand({
    execute: (args: EnrichmentRequest) =>
        cloudAction<unknown, RemoteEnrichmentResult>("enrichment:suggest", { ...args, aiConsent: AI_CONSENT_VERSION }),
    label: "cloud:enrichment-suggest",
});

/** Names only: `packages/backend/confect/enrichment.test.ts` asserts the action's validator against this field set. */
export function enrichmentTransport(): EnrichmentFn | null {
    if (!authenticated) {
        return null;
    }
    return (args) => runCloud(enrichmentCommand, args);
}

const decodeAnsweredJobs = Schema.decodeUnknownOption(
    Schema.mutable(
        Schema.Array(
            Schema.Struct({
                localId: Schema.String,
                name: Schema.String,
                result: Schema.NullOr(
                    Schema.Struct({
                        categoryName: Schema.NullOr(Schema.String),
                        domain: Schema.NullOr(Schema.String),
                        emoji: Schema.NullOr(Schema.String),
                        isNewCategory: Schema.Boolean,
                        merchantName: Schema.NullOr(Schema.String),
                        parentCategoryName: Schema.NullOr(Schema.String),
                        tags: Schema.Array(Schema.String),
                    })
                ),
            })
        )
    )
);

export interface EnrichmentQueueTransport {
    ack: (localIds: string[]) => Effect.Effect<null, CloudError>;
    enqueue: (request: EnrichmentJobRequest) => Effect.Effect<boolean, CloudError>;
}

export function enrichmentQueueTransport(): EnrichmentQueueTransport {
    return {
        ack: (localIds) => cloudMutation("enrichmentQueue:ack", { localIds }),
        enqueue: (request) => cloudMutation("enrichmentQueue:enqueue", { ...request, aiConsent: AI_CONSENT_VERSION }),
    };
}

export function watchEnrichmentResults(onJobs: (jobs: AnsweredJob[]) => void): () => void {
    if (cloudRuntime === null) {
        return () => undefined;
    }
    // SAFETY: addressed by path for the reason given on `cloudQuery`.
    const watch = cloudRuntime.convex.watchQuery("enrichmentQueue:results" as never, {} as never);
    return watch.onUpdate(() => {
        let jobs: ReturnType<typeof decodeAnsweredJobs> | null = null;
        try {
            jobs = decodeAnsweredJobs(watch.localQueryResult());
        } catch {
            jobs = null;
        }
        if (jobs !== null && Option.isSome(jobs) && jobs.value.length > 0) {
            onJobs(jobs.value);
        }
    });
}

export interface LabelSuggestion {
    categoryName: string;
    domain?: string | null;
    label: string;
}

export type CsvImportStatus =
    | "ok"
    | "unauthenticated"
    | "notConfigured"
    | "rateLimited"
    | "notEntitled"
    | "invalid"
    | "providerError"
    | "invalidResponse";

export interface CsvImportResult {
    degraded?: boolean;
    status: CsvImportStatus;
    suggestions: LabelSuggestion[] | null;
}

export interface CsvImportRequest {
    categoryTree: CategoryBranch[];
    groundedLookup?: boolean;
    labels: string[];
    regionCode?: string;
}

export type CsvImportFn = (args: CsvImportRequest) => Effect.Effect<CsvImportResult, CloudError>;

export function csvImportTransport(): CsvImportFn {
    return (args) => cloudAction("csvImport:csvImport", { ...args, aiConsent: AI_CONSENT_VERSION });
}

interface VoiceDraftBase {
    amount: number;
    /** ISO 4217; null is the ledger's own currency. */
    currency: string | null;
    /** `YYYY-MM-DD` on the device's calendar, as it was sent. */
    date: string;
    details: string | null;
}

export type VoiceRecurrenceUnit = "day" | "week" | "month" | "year";

export interface VoiceRecurrence {
    every: number;
    unit: VoiceRecurrenceUnit;
}

interface VoiceEntryDraft extends VoiceDraftBase {
    accountName: string | null;
    categoryName: string | null;
    domain: string | null;
    income: boolean;
    kind: "entry";
    merchant: string;
    recurrence: VoiceRecurrence | null;
}

interface VoiceTransferDraft extends VoiceDraftBase {
    fromAccountName: string | null;
    kind: "transfer";
    toAccountName: string | null;
}

export type VoiceDraft = VoiceEntryDraft | VoiceTransferDraft;

export type VoiceQuoteField = "amount" | "merchant" | "category" | "account" | "date" | "schedule";

export interface VoiceQuote {
    field: VoiceQuoteField;
    text: string;
}

export interface ProposedDraft {
    draft: VoiceDraft | null;
    quotes?: VoiceQuote[];
}

type SpeakStatus =
    | "ok"
    | "unauthenticated"
    | "notConfigured"
    | "rateLimited"
    | "notEntitled"
    | "quotaExceeded"
    | "invalid"
    | "providerError"
    | "unclear";

interface SpeakResult {
    order: number | null;
    status: SpeakStatus;
    transcript: string | null;
}

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

/** Must match the server's tool name; its UI part is `tool-${name}`. */
export const PROPOSE_DRAFT_TOOL = "proposeDraft";

export const VOICE_TURNS_QUERY = makeFunctionReference<
    "query",
    { paginationOpts: PaginationOptions; streamArgs?: StreamArgs; threadId: string },
    PaginationResult<UIMessage> & { streams: SyncStreamsReturnValue }
>("voiceEntry:listTurns");

export const USAGE_LIMITS_QUERY = makeFunctionReference<"query", Record<string, never>, UsageLimits | null>(
    "limits:mine"
);

export interface StartThreadResult {
    status: "ok" | "unauthenticated" | "rateLimited";
    threadId: string | null;
}

export interface VoiceThreadTransport {
    end: (threadId: string) => Promise<null>;
    speak: (args: SpeakRequest) => Promise<SpeakResult>;
    start: () => Promise<StartThreadResult>;
}

const endThreadCommand = createCommand({
    execute: (threadId: string) => cloudMutation<unknown, null>("voiceEntry:endThread", { threadId }),
    label: "cloud:voice-end-thread",
});

const speakCommand = createCommand({
    execute: (args: SpeakRequest) =>
        cloudAction<unknown, SpeakResult>("voiceEntry:speak", { ...args, aiConsent: AI_CONSENT_VERSION }),
    label: "cloud:voice-speak",
});

const startThreadCommand = createCommand({
    execute: () => cloudMutation<unknown, StartThreadResult>("voiceEntry:startThread", {}),
    label: "cloud:voice-start-thread",
});

export function voiceThreadTransport(): VoiceThreadTransport {
    return {
        end: (threadId) => runCloud(endThreadCommand, threadId),
        speak: (args) => runCloud(speakCommand, args),
        start: () => runCloud(startThreadCommand, undefined),
    };
}

const UploadReceipt = Schema.Struct({ storageId: Schema.optional(Schema.String) });

/** Convex file storage answers the PUT with the id it allocated; R2 sends nothing. */
const decodeUploadReceipt = HttpIncomingMessage.schemaBodyJson(UploadReceipt);

const isOk = (status: number) => status >= 200 && status < 300;

const failed = (kind: "download" | "upload", cause: Error) => new CloudError({ cause, kind, path: "photos" });

export const photoTransport = Effect.fn("Cloud.photoTransport")(function* photoTransport() {
    const client = yield* HttpClient.HttpClient;

    const get = Effect.fn("Cloud.photoGet")(function* get(url: string) {
        const response = yield* client
            .execute(HttpClientRequest.get(url))
            .pipe(Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("download", cause)) }));
        if (response.status === 404 || response.status === 403) {
            return null;
        }
        if (!isOk(response.status)) {
            return yield* failed("download", new Error(`Photo download failed: ${response.status}`));
        }
        const bytes = yield* response.arrayBuffer.pipe(
            Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("download", cause)) })
        );
        return new Uint8Array(bytes);
    });

    const put = Effect.fn("Cloud.photoPut")(function* put(url: string, bytes: Uint8Array) {
        const response = yield* client
            .execute(HttpClientRequest.put(url).pipe(HttpClientRequest.bodyUint8Array(bytes, "image/jpeg")))
            .pipe(Effect.catchTags({ HttpClientError: (cause) => Effect.fail(failed("upload", cause)) }));
        if (!isOk(response.status)) {
            return yield* failed("upload", new Error(`Photo upload failed: ${response.status}`));
        }
        return yield* decodeUploadReceipt(response).pipe(
            Effect.map((receipt) => receipt.storageId ?? null),
            Effect.catchTags({
                HttpClientError: () => Effect.succeed(null),
                SchemaError: () => Effect.succeed(null),
            })
        );
    });

    return {
        confirmUpload: (key, storageId) =>
            cloudAction<unknown, unknown>("photos:confirmUpload", storageId ? { key, storageId } : { key }).pipe(
                Effect.asVoid
            ),
        get,
        put,
        readUrls: (keys) => cloudMutation("photos:readUrls", { keys: [...keys] }),
        release: (key) => cloudMutation<unknown, unknown>("photos:releaseUnreferenced", { key }).pipe(Effect.asVoid),
        requestUpload: (name) => cloudMutation("photos:requestUpload", { name }),
    } satisfies PhotoTransport;
});

export interface ReceiptItem {
    name: string;
    /** The line's total in the receipt's currency, quantity included. */
    price: number;
    quantity: number;
}

export interface ReceiptDraft {
    accountName: string | null;
    categoryName: string | null;
    currency: string | null;
    currencySource: "printed" | "inferred";
    /** The receipt named a code the ledger cannot price; `currency` is null as a stand-in, never a guess. */
    currencyUnresolved: boolean;
    date: string;
    domain: string | null;
    income: boolean;
    items: ReceiptItem[];
    merchant: string;
    paymentMethod: string | null;
    subtotal: number | null;
    tax: number | null;
    tip: number | null;
    total: number;
}

type ScanStatus =
    | "ok"
    | "unauthenticated"
    | "notConfigured"
    | "rateLimited"
    | "notEntitled"
    | "quotaExceeded"
    | "invalid"
    | "providerError"
    | "invalidResponse"
    | "unclear";

interface ScanResult {
    receipt: ReceiptDraft | null;
    status: ScanStatus;
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

export type ReceiptScanFn = (args: ScanRequest) => Promise<ScanResult>;

const receiptScanCommand = createCommand({
    execute: (args: ScanRequest) =>
        cloudAction<unknown, ScanResult>("receiptScan:scan", { ...args, aiConsent: AI_CONSENT_VERSION }),
    label: "cloud:receipt-scan",
});

export function receiptScanTransport(): ReceiptScanFn {
    return (args) => runCloud(receiptScanCommand, args);
}

export interface InstallmentPlanRow {
    amount: number;
    dueDate: string;
    fee: number;
    paid: boolean;
    sequence: number;
}

export interface InstallmentPlanDraft {
    accountName: string | null;
    currency: string | null;
    provider: string | null;
    rows: InstallmentPlanRow[];
}

interface InstallmentScanResult {
    plan: InstallmentPlanDraft | null;
    status: ScanStatus;
}

export type InstallmentScanRequest = Omit<ScanRequest, "categoryTree">;

export type InstallmentScanFn = (args: InstallmentScanRequest) => Promise<InstallmentScanResult>;

const installmentScanCommand = createCommand({
    execute: (args: InstallmentScanRequest) =>
        cloudAction<unknown, InstallmentScanResult>("installmentScan:scan", { ...args, aiConsent: AI_CONSENT_VERSION }),
    label: "cloud:installment-scan",
});

export function installmentScanTransport(): InstallmentScanFn {
    return (args) => runCloud(installmentScanCommand, args);
}
