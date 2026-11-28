import { GenericId } from "@confect/core";
import type { SystemTableNames } from "convex/server";

export type TableNames = "accountDeletionJobs" | "accounts" | "appMeta" | "bankAccounts" | "bankEntries" | "bankHolders" | "bankInstitutionSyncs" | "bankInstitutions" | "budgetPlans" | "budgets" | "captureKeys" | "categories" | "enrichmentJobs" | "exchangeRates" | "groundedSpend" | "inboundWrites" | "installmentPlans" | "installments" | "ledgerCells" | "mailState" | "mainBudget" | "merchantKnowledge" | "openStats" | "outboundEmails" | "outsideMoves" | "outsidePayments" | "photoObjects" | "photoSizes" | "profileInvites" | "profileMembers" | "profiles" | "referralCodes" | "referralRewards" | "referrals" | "reviewPushTargets" | "savingsGoals" | "sharedReports" | "syncState" | "tags" | "transactionAttachments" | "transactionPhotos" | "transactionSplits" | "transactionTags" | "transactions" | "transfers" | "voiceStreamCredits" | "voiceThreads" | "voiceTurns" | "webPushSubscriptions" | "webhookDeliveries" | "webhookEndpoints" | "webhookEvents" | "webhookTokens";

export type Id<TableName extends TableNames | SystemTableNames> = GenericId.GenericId<TableName>;

export const Id = <const TableName extends TableNames | SystemTableNames>(
  tableName: TableName,
) => GenericId.GenericId(tableName);
