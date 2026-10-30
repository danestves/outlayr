/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as binance from "../binance.js";
import type * as cotizave from "../cotizave.js";
import type * as crons from "../crons.js";
import type * as csvImport from "../csvImport.js";
import type * as enrichment from "../enrichment.js";
import type * as enrichmentQueue from "../enrichmentQueue.js";
import type * as exchangeRates from "../exchangeRates.js";
import type * as featureRequests from "../featureRequests.js";
import type * as groundedLookup from "../groundedLookup.js";
import type * as groundedSpend from "../groundedSpend.js";
import type * as http from "../http.js";
import type * as installmentScan from "../installmentScan.js";
import type * as limits from "../limits.js";
import type * as mcp from "../mcp.js";
import type * as mcpEntries from "../mcpEntries.js";
import type * as mcpLedger from "../mcpLedger.js";
import type * as merchantKnowledge from "../merchantKnowledge.js";
import type * as openexchangerates from "../openexchangerates.js";
import type * as photos from "../photos.js";
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
  accountDeletion: typeof accountDeletion;
  binance: typeof binance;
  cotizave: typeof cotizave;
  crons: typeof crons;
  csvImport: typeof csvImport;
  enrichment: typeof enrichment;
  enrichmentQueue: typeof enrichmentQueue;
  exchangeRates: typeof exchangeRates;
  featureRequests: typeof featureRequests;
  groundedLookup: typeof groundedLookup;
  groundedSpend: typeof groundedSpend;
  http: typeof http;
  installmentScan: typeof installmentScan;
  limits: typeof limits;
  mcp: typeof mcp;
  mcpEntries: typeof mcpEntries;
  mcpLedger: typeof mcpLedger;
  merchantKnowledge: typeof merchantKnowledge;
  openexchangerates: typeof openexchangerates;
  photos: typeof photos;
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
  mcp: import("@convex-dev/mcp/_generated/component.js").ComponentApi<"mcp">;
  revenuecat: import("convex-revenuecat/_generated/component.js").ComponentApi<"revenuecat">;
  enrichmentPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"enrichmentPool">;
};
