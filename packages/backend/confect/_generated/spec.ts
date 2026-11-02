import { GroupSpec, Spec } from "@confect/core";
import accountDeletion from "../accountDeletion.spec";
import binance from "../binance.spec";
import cotizave from "../cotizave.spec";
import csvImport from "../csvImport.spec";
import enrichment from "../enrichment.spec";
import enrichmentQueue from "../enrichmentQueue.spec";
import exchangeRates from "../exchangeRates.spec";
import featureRequests from "../featureRequests.spec";
import groundedLookup from "../groundedLookup.spec";
import groundedSpend from "../groundedSpend.spec";
import installmentScan from "../installmentScan.spec";
import legal from "../legal.spec";
import limits from "../limits.spec";
import mail from "../mail.spec";
import mailDelivery from "../mailDelivery.spec";
import mcp from "../mcp.spec";
import mcpEntries from "../mcpEntries.spec";
import mcpLedger from "../mcpLedger.spec";
import merchantKnowledge from "../merchantKnowledge.spec";
import notion from "../notion.spec";
import openStats from "../openStats.spec";
import openexchangerates from "../openexchangerates.spec";
import photos from "../photos.spec";
import receiptScan from "../receiptScan.spec";
import revenuecat from "../revenuecat.spec";
import sync from "../sync.spec";
import voiceEntry from "../voiceEntry.spec";

const spec: Spec.Spec<{
  readonly accountDeletion: GroupSpec.NamedAt<typeof accountDeletion, "accountDeletion">;
  readonly binance: GroupSpec.NamedAt<typeof binance, "binance">;
  readonly cotizave: GroupSpec.NamedAt<typeof cotizave, "cotizave">;
  readonly csvImport: GroupSpec.NamedAt<typeof csvImport, "csvImport">;
  readonly enrichment: GroupSpec.NamedAt<typeof enrichment, "enrichment">;
  readonly enrichmentQueue: GroupSpec.NamedAt<typeof enrichmentQueue, "enrichmentQueue">;
  readonly exchangeRates: GroupSpec.NamedAt<typeof exchangeRates, "exchangeRates">;
  readonly featureRequests: GroupSpec.NamedAt<typeof featureRequests, "featureRequests">;
  readonly groundedLookup: GroupSpec.NamedAt<typeof groundedLookup, "groundedLookup">;
  readonly groundedSpend: GroupSpec.NamedAt<typeof groundedSpend, "groundedSpend">;
  readonly installmentScan: GroupSpec.NamedAt<typeof installmentScan, "installmentScan">;
  readonly legal: GroupSpec.NamedAt<typeof legal, "legal">;
  readonly limits: GroupSpec.NamedAt<typeof limits, "limits">;
  readonly mail: GroupSpec.NamedAt<typeof mail, "mail">;
  readonly mailDelivery: GroupSpec.NamedAt<typeof mailDelivery, "mailDelivery">;
  readonly mcp: GroupSpec.NamedAt<typeof mcp, "mcp">;
  readonly mcpEntries: GroupSpec.NamedAt<typeof mcpEntries, "mcpEntries">;
  readonly mcpLedger: GroupSpec.NamedAt<typeof mcpLedger, "mcpLedger">;
  readonly merchantKnowledge: GroupSpec.NamedAt<typeof merchantKnowledge, "merchantKnowledge">;
  readonly notion: GroupSpec.NamedAt<typeof notion, "notion">;
  readonly openStats: GroupSpec.NamedAt<typeof openStats, "openStats">;
  readonly openexchangerates: GroupSpec.NamedAt<typeof openexchangerates, "openexchangerates">;
  readonly photos: GroupSpec.NamedAt<typeof photos, "photos">;
  readonly receiptScan: GroupSpec.NamedAt<typeof receiptScan, "receiptScan">;
  readonly revenuecat: GroupSpec.NamedAt<typeof revenuecat, "revenuecat">;
  readonly sync: GroupSpec.NamedAt<typeof sync, "sync">;
  readonly voiceEntry: GroupSpec.NamedAt<typeof voiceEntry, "voiceEntry">;
}> = Spec.fromGroups({
  ["accountDeletion"]: accountDeletion,
  ["binance"]: binance,
  ["cotizave"]: cotizave,
  ["csvImport"]: csvImport,
  ["enrichment"]: enrichment,
  ["enrichmentQueue"]: enrichmentQueue,
  ["exchangeRates"]: exchangeRates,
  ["featureRequests"]: featureRequests,
  ["groundedLookup"]: groundedLookup,
  ["groundedSpend"]: groundedSpend,
  ["installmentScan"]: installmentScan,
  ["legal"]: legal,
  ["limits"]: limits,
  ["mail"]: mail,
  ["mailDelivery"]: mailDelivery,
  ["mcp"]: mcp,
  ["mcpEntries"]: mcpEntries,
  ["mcpLedger"]: mcpLedger,
  ["merchantKnowledge"]: merchantKnowledge,
  ["notion"]: notion,
  ["openStats"]: openStats,
  ["openexchangerates"]: openexchangerates,
  ["photos"]: photos,
  ["receiptScan"]: receiptScan,
  ["revenuecat"]: revenuecat,
  ["sync"]: sync,
  ["voiceEntry"]: voiceEntry,
}) as typeof spec;

export default spec;
