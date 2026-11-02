import { defineSchema as $defineSchema } from "convex/server";
import { Table as $Table } from "@confect/server";

import accountDeletionJobs from "./tables/accountDeletionJobs";
import accounts from "./tables/accounts";
import appMeta from "./tables/appMeta";
import budgetPlans from "./tables/budgetPlans";
import budgets from "./tables/budgets";
import categories from "./tables/categories";
import enrichmentJobs from "./tables/enrichmentJobs";
import exchangeRates from "./tables/exchangeRates";
import groundedSpend from "./tables/groundedSpend";
import installmentPlans from "./tables/installmentPlans";
import installments from "./tables/installments";
import mailState from "./tables/mailState";
import mainBudget from "./tables/mainBudget";
import merchantKnowledge from "./tables/merchantKnowledge";
import openStats from "./tables/openStats";
import outsideMoves from "./tables/outsideMoves";
import outsidePayments from "./tables/outsidePayments";
import photoObjects from "./tables/photoObjects";
import photoSizes from "./tables/photoSizes";
import savingsGoals from "./tables/savingsGoals";
import syncState from "./tables/syncState";
import tags from "./tables/tags";
import transactionAttachments from "./tables/transactionAttachments";
import transactionPhotos from "./tables/transactionPhotos";
import transactionSplits from "./tables/transactionSplits";
import transactionTags from "./tables/transactionTags";
import transactions from "./tables/transactions";
import transfers from "./tables/transfers";

export default $defineSchema({
  accountDeletionJobs: $Table.tableDefinition(accountDeletionJobs),
  accounts: $Table.tableDefinition(accounts),
  appMeta: $Table.tableDefinition(appMeta),
  budgetPlans: $Table.tableDefinition(budgetPlans),
  budgets: $Table.tableDefinition(budgets),
  categories: $Table.tableDefinition(categories),
  enrichmentJobs: $Table.tableDefinition(enrichmentJobs),
  exchangeRates: $Table.tableDefinition(exchangeRates),
  groundedSpend: $Table.tableDefinition(groundedSpend),
  installmentPlans: $Table.tableDefinition(installmentPlans),
  installments: $Table.tableDefinition(installments),
  mailState: $Table.tableDefinition(mailState),
  mainBudget: $Table.tableDefinition(mainBudget),
  merchantKnowledge: $Table.tableDefinition(merchantKnowledge),
  openStats: $Table.tableDefinition(openStats),
  outsideMoves: $Table.tableDefinition(outsideMoves),
  outsidePayments: $Table.tableDefinition(outsidePayments),
  photoObjects: $Table.tableDefinition(photoObjects),
  photoSizes: $Table.tableDefinition(photoSizes),
  savingsGoals: $Table.tableDefinition(savingsGoals),
  syncState: $Table.tableDefinition(syncState),
  tags: $Table.tableDefinition(tags),
  transactionAttachments: $Table.tableDefinition(transactionAttachments),
  transactionPhotos: $Table.tableDefinition(transactionPhotos),
  transactionSplits: $Table.tableDefinition(transactionSplits),
  transactionTags: $Table.tableDefinition(transactionTags),
  transactions: $Table.tableDefinition(transactions),
  transfers: $Table.tableDefinition(transfers),
});
