import { DatabaseSchema as $DatabaseSchema } from "@confect/server";

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
import outsideMoves from "./tables/outsideMoves";
import outsidePayments from "./tables/outsidePayments";
import photoObjects from "./tables/photoObjects";
import photoSizes from "./tables/photoSizes";
import profiles from "./tables/profiles";
import savingsGoals from "./tables/savingsGoals";
import syncState from "./tables/syncState";
import tags from "./tables/tags";
import transactionAttachments from "./tables/transactionAttachments";
import transactionPhotos from "./tables/transactionPhotos";
import transactionSplits from "./tables/transactionSplits";
import transactionTags from "./tables/transactionTags";
import transactions from "./tables/transactions";
import transfers from "./tables/transfers";

const databaseSchema: $DatabaseSchema.DatabaseSchema<{
  readonly accountDeletionJobs: typeof accountDeletionJobs;
  readonly accounts: typeof accounts;
  readonly appMeta: typeof appMeta;
  readonly budgetPlans: typeof budgetPlans;
  readonly budgets: typeof budgets;
  readonly categories: typeof categories;
  readonly enrichmentJobs: typeof enrichmentJobs;
  readonly exchangeRates: typeof exchangeRates;
  readonly groundedSpend: typeof groundedSpend;
  readonly installmentPlans: typeof installmentPlans;
  readonly installments: typeof installments;
  readonly mailState: typeof mailState;
  readonly mainBudget: typeof mainBudget;
  readonly merchantKnowledge: typeof merchantKnowledge;
  readonly outsideMoves: typeof outsideMoves;
  readonly outsidePayments: typeof outsidePayments;
  readonly photoObjects: typeof photoObjects;
  readonly photoSizes: typeof photoSizes;
  readonly profiles: typeof profiles;
  readonly savingsGoals: typeof savingsGoals;
  readonly syncState: typeof syncState;
  readonly tags: typeof tags;
  readonly transactionAttachments: typeof transactionAttachments;
  readonly transactionPhotos: typeof transactionPhotos;
  readonly transactionSplits: typeof transactionSplits;
  readonly transactionTags: typeof transactionTags;
  readonly transactions: typeof transactions;
  readonly transfers: typeof transfers;
}> = $DatabaseSchema.make({
  accountDeletionJobs,
  accounts,
  appMeta,
  budgetPlans,
  budgets,
  categories,
  enrichmentJobs,
  exchangeRates,
  groundedSpend,
  installmentPlans,
  installments,
  mailState,
  mainBudget,
  merchantKnowledge,
  outsideMoves,
  outsidePayments,
  photoObjects,
  photoSizes,
  profiles,
  savingsGoals,
  syncState,
  tags,
  transactionAttachments,
  transactionPhotos,
  transactionSplits,
  transactionTags,
  transactions,
  transfers,
});

export default databaseSchema;
