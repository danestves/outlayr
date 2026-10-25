import type { StreamArgs, SyncStreamsReturnValue, UIMessage } from "@convex-dev/agent";
import { utcDateString } from "@outlayr/money/dates";
import { makeFunctionReference } from "convex/server";
import type { PaginationOptions, PaginationResult } from "convex/server";
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

/** Addressed by string path: `packages/backend` is not a build dependency, so the generated `api` object is absent. */
export function cloudQuery<Args, Result>(path: string, args: Args): Promise<Result> {
    // SAFETY: `never` satisfies the generated-API overloads; the real values are a deployed function's path and args.
    return cloudClient().query(path as never, args as never) as Promise<Result>;
}

export function cloudMutation<Args, Result>(path: string, args: Args): Promise<Result> {
    // SAFETY: as in `cloudQuery`.
    return cloudClient().mutation(path as never, args as never) as Promise<Result>;
}

export function cloudAction<Args, Result>(path: string, args: Args): Promise<Result> {
    // SAFETY: as in `cloudQuery`.
    return cloudClient().action(path as never, args as never) as Promise<Result>;
}

/** Rounded to the UTC day so identical args let Convex answer every page and device from its query cache. */
function rateWindowAt(): number {
    return Date.parse(utcDateString(Date.now()));
}

export function ratesPuller(): PullRatesFn {
    return async (args) => cloudQuery("exchangeRates:pullRates", { ...args, at: rateWindowAt() });
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
        pull: async (args) => cloudQuery("sync:pullSince", args),
        push: async (args) => cloudMutation("sync:push", args),
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

/** Names only: `packages/backend/confect/enrichment.test.ts` asserts the action's validator against this field set. */
export function enrichmentTransport(): EnrichmentFn | null {
    if (!authenticated) {
        return null;
    }
    return async (args) => cloudAction("enrichment:suggest", { ...args, aiConsent: AI_CONSENT_VERSION });
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
    ack: (localIds: string[]) => Promise<null>;
    enqueue: (request: EnrichmentJobRequest) => Promise<boolean>;
}

export function enrichmentQueueTransport(): EnrichmentQueueTransport {
    return {
        ack: async (localIds) => cloudMutation("enrichmentQueue:ack", { localIds }),
        enqueue: async (request) =>
            cloudMutation("enrichmentQueue:enqueue", { ...request, aiConsent: AI_CONSENT_VERSION }),
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

export type CsvImportFn = (args: CsvImportRequest) => Promise<CsvImportResult>;

export function csvImportTransport(): CsvImportFn {
    return async (args) => cloudAction("csvImport:csvImport", { ...args, aiConsent: AI_CONSENT_VERSION });
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

export function voiceThreadTransport(): VoiceThreadTransport {
    return {
        end: async (threadId) => cloudMutation("voiceEntry:endThread", { threadId }),
        speak: async (args) => cloudAction("voiceEntry:speak", { ...args, aiConsent: AI_CONSENT_VERSION }),
        start: async () => cloudMutation("voiceEntry:startThread", {}),
    };
}

/** Convex file storage answers the PUT with the id it allocated; R2 sends nothing. */
const decodeUploadReceipt = Schema.decodeUnknownOption(Schema.Struct({ storageId: Schema.optional(Schema.String) }));

export function photoTransport(): PhotoTransport {
    return {
        confirmUpload: async (key, storageId) => {
            await cloudAction("photos:confirmUpload", storageId ? { key, storageId } : { key });
        },
        get: async (url) => {
            const response = await fetch(url);
            if (response.status === 404 || response.status === 403) {
                // Gone, or the url outlived its signature: no bytes this pass, retry next one.
                return null;
            }
            if (!response.ok) {
                throw new Error(`Photo download failed: ${response.status}`);
            }
            return new Uint8Array(await response.arrayBuffer());
        },
        put: async (url, bytes) => {
            const response = await fetch(url, {
                // SAFETY: React Native sends a typed array as raw bytes, but its `BodyInit` type omits typed arrays.
                body: bytes as unknown as BodyInit,
                headers: { "Content-Type": "image/jpeg" },
                method: "PUT",
            });
            if (!response.ok) {
                throw new Error(`Photo upload failed: ${response.status}`);
            }
            try {
                return Option.getOrUndefined(decodeUploadReceipt(await response.json()))?.storageId ?? null;
            } catch {
                return null;
            }
        },
        // A mutation though it writes nothing: a cached query result could serve an expired signed url forever.
        // See `photos.readUrls`.
        readUrls: async (keys) => cloudMutation("photos:readUrls", { keys: [...keys] }),
        release: async (key) => {
            await cloudMutation("photos:releaseUnreferenced", { key });
        },
        requestUpload: async (name) => cloudMutation("photos:requestUpload", { name }),
    };
}

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

export function receiptScanTransport(): ReceiptScanFn {
    return async (args) => cloudAction("receiptScan:scan", { ...args, aiConsent: AI_CONSENT_VERSION });
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

export function installmentScanTransport(): InstallmentScanFn {
    return async (args) => cloudAction("installmentScan:scan", { ...args, aiConsent: AI_CONSENT_VERSION });
}
