import { GenericId } from "@confect/core";
import type { SystemTableNames } from "convex/server";

export type TableNames = "accountDeletionJobs" | "accounts" | "appMeta" | "budgetPlans" | "budgets" | "categories" | "enrichmentJobs" | "exchangeRates" | "groundedSpend" | "installmentPlans" | "installments" | "mailState" | "mainBudget" | "merchantKnowledge" | "openStats" | "outsideMoves" | "outsidePayments" | "photoObjects" | "photoSizes" | "savingsGoals" | "syncState" | "tags" | "transactionAttachments" | "transactionPhotos" | "transactionSplits" | "transactionTags" | "transactions" | "transfers";

export type Id<TableName extends TableNames | SystemTableNames> = GenericId.GenericId<TableName>;

export const Id = <const TableName extends TableNames | SystemTableNames>(
  tableName: TableName,
) => GenericId.GenericId(tableName);
