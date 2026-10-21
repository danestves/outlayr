/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as accountDeletion from "../accountDeletion.js";
import type * as auth from "../auth.js";
import type * as cotizave from "../cotizave.js";
import type * as crons from "../crons.js";
import type * as csvImport from "../csvImport.js";
import type * as enrichment from "../enrichment.js";
import type * as enrichmentQueue from "../enrichmentQueue.js";
import type * as exchangeRates from "../exchangeRates.js";
import type * as groundedLookup from "../groundedLookup.js";
import type * as groundedSpend from "../groundedSpend.js";
import type * as http from "../http.js";
import type * as installmentScan from "../installmentScan.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_captures from "../lib/captures.js";
import type * as lib_currencies from "../lib/currencies.js";
import type * as lib_ledgerPrompt from "../lib/ledgerPrompt.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_merchantKey from "../lib/merchantKey.js";
import type * as lib_merchantTrust from "../lib/merchantTrust.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_photoKeys from "../lib/photoKeys.js";
import type * as lib_posthog from "../lib/posthog.js";
import type * as lib_sanitizeLimits from "../lib/sanitizeLimits.js";
import type * as lib_sha256Hex from "../lib/sha256Hex.js";
import type * as lib_spend from "../lib/spend.js";
import type * as lib_syncTables from "../lib/syncTables.js";
import type * as limits from "../limits.js";
import type * as mcp from "../mcp.js";
import type * as mcpEntries from "../mcpEntries.js";
import type * as mcpLedger from "../mcpLedger.js";
import type * as mcpPages from "../mcpPages.js";
import type * as merchantKnowledge from "../merchantKnowledge.js";
import type * as openexchangerates from "../openexchangerates.js";
import type * as photos from "../photos.js";
import type * as providerLifecycle from "../providerLifecycle.js";
import type * as receiptScan from "../receiptScan.js";
import type * as revenuecat from "../revenuecat.js";
import type * as sync from "../sync.js";
import type * as voiceEntry from "../voiceEntry.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  accountDeletion: typeof accountDeletion;
  auth: typeof auth;
  cotizave: typeof cotizave;
  crons: typeof crons;
  csvImport: typeof csvImport;
  enrichment: typeof enrichment;
  enrichmentQueue: typeof enrichmentQueue;
  exchangeRates: typeof exchangeRates;
  groundedLookup: typeof groundedLookup;
  groundedSpend: typeof groundedSpend;
  http: typeof http;
  installmentScan: typeof installmentScan;
  "lib/auth": typeof lib_auth;
  "lib/captures": typeof lib_captures;
  "lib/currencies": typeof lib_currencies;
  "lib/ledgerPrompt": typeof lib_ledgerPrompt;
  "lib/limits": typeof lib_limits;
  "lib/merchantKey": typeof lib_merchantKey;
  "lib/merchantTrust": typeof lib_merchantTrust;
  "lib/models": typeof lib_models;
  "lib/photoKeys": typeof lib_photoKeys;
  "lib/posthog": typeof lib_posthog;
  "lib/sanitizeLimits": typeof lib_sanitizeLimits;
  "lib/sha256Hex": typeof lib_sha256Hex;
  "lib/spend": typeof lib_spend;
  "lib/syncTables": typeof lib_syncTables;
  limits: typeof limits;
  mcp: typeof mcp;
  mcpEntries: typeof mcpEntries;
  mcpLedger: typeof mcpLedger;
  mcpPages: typeof mcpPages;
  merchantKnowledge: typeof merchantKnowledge;
  openexchangerates: typeof openexchangerates;
  photos: typeof photos;
  providerLifecycle: typeof providerLifecycle;
  receiptScan: typeof receiptScan;
  revenuecat: typeof revenuecat;
  sync: typeof sync;
  voiceEntry: typeof voiceEntry;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  mcpGateway: import("convex-mcp-gateway/_generated/component.js").ComponentApi<"mcpGateway">;
  revenuecat: import("convex-revenuecat/_generated/component.js").ComponentApi<"revenuecat">;
  enrichmentPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"enrichmentPool">;
};
