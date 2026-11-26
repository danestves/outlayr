import { DatabaseSchema as $DatabaseSchema } from "@confect/server";

import accountDeletionJobs from "./tables/accountDeletionJobs";
import accounts from "./tables/accounts";
import appMeta from "./tables/appMeta";
import bankAccounts from "./tables/bankAccounts";
import bankEntries from "./tables/bankEntries";
import bankHolders from "./tables/bankHolders";
import bankInstitutions from "./tables/bankInstitutions";
import budgetPlans from "./tables/budgetPlans";
import budgets from "./tables/budgets";
import captureKeys from "./tables/captureKeys";
import categories from "./tables/categories";
import enrichmentJobs from "./tables/enrichmentJobs";
import exchangeRates from "./tables/exchangeRates";
import groundedSpend from "./tables/groundedSpend";
import inboundWrites from "./tables/inboundWrites";
import installmentPlans from "./tables/installmentPlans";
import installments from "./tables/installments";
import ledgerCells from "./tables/ledgerCells";
import mailState from "./tables/mailState";
import mainBudget from "./tables/mainBudget";
import merchantKnowledge from "./tables/merchantKnowledge";
import openStats from "./tables/openStats";
import outboundEmails from "./tables/outboundEmails";
import outsideMoves from "./tables/outsideMoves";
import outsidePayments from "./tables/outsidePayments";
import photoObjects from "./tables/photoObjects";
import photoSizes from "./tables/photoSizes";
import profileInvites from "./tables/profileInvites";
import profileMembers from "./tables/profileMembers";
import profiles from "./tables/profiles";
import referralCodes from "./tables/referralCodes";
import referralRewards from "./tables/referralRewards";
import referrals from "./tables/referrals";
import savingsGoals from "./tables/savingsGoals";
import sharedReports from "./tables/sharedReports";
import syncState from "./tables/syncState";
import tags from "./tables/tags";
import transactionAttachments from "./tables/transactionAttachments";
import transactionPhotos from "./tables/transactionPhotos";
import transactionSplits from "./tables/transactionSplits";
import transactionTags from "./tables/transactionTags";
import transactions from "./tables/transactions";
import transfers from "./tables/transfers";
import voiceStreamCredits from "./tables/voiceStreamCredits";
import voiceThreads from "./tables/voiceThreads";
import voiceTurns from "./tables/voiceTurns";
import webPushSubscriptions from "./tables/webPushSubscriptions";
import webhookDeliveries from "./tables/webhookDeliveries";
import webhookEndpoints from "./tables/webhookEndpoints";
import webhookEvents from "./tables/webhookEvents";
import webhookTokens from "./tables/webhookTokens";

const databaseSchema: $DatabaseSchema.DatabaseSchema<{
  readonly accountDeletionJobs: typeof accountDeletionJobs;
  readonly accounts: typeof accounts;
  readonly appMeta: typeof appMeta;
  readonly bankAccounts: typeof bankAccounts;
  readonly bankEntries: typeof bankEntries;
  readonly bankHolders: typeof bankHolders;
  readonly bankInstitutions: typeof bankInstitutions;
  readonly budgetPlans: typeof budgetPlans;
  readonly budgets: typeof budgets;
  readonly captureKeys: typeof captureKeys;
  readonly categories: typeof categories;
  readonly enrichmentJobs: typeof enrichmentJobs;
  readonly exchangeRates: typeof exchangeRates;
  readonly groundedSpend: typeof groundedSpend;
  readonly inboundWrites: typeof inboundWrites;
  readonly installmentPlans: typeof installmentPlans;
  readonly installments: typeof installments;
  readonly ledgerCells: typeof ledgerCells;
  readonly mailState: typeof mailState;
  readonly mainBudget: typeof mainBudget;
  readonly merchantKnowledge: typeof merchantKnowledge;
  readonly openStats: typeof openStats;
  readonly outboundEmails: typeof outboundEmails;
  readonly outsideMoves: typeof outsideMoves;
  readonly outsidePayments: typeof outsidePayments;
  readonly photoObjects: typeof photoObjects;
  readonly photoSizes: typeof photoSizes;
  readonly profileInvites: typeof profileInvites;
  readonly profileMembers: typeof profileMembers;
  readonly profiles: typeof profiles;
  readonly referralCodes: typeof referralCodes;
  readonly referralRewards: typeof referralRewards;
  readonly referrals: typeof referrals;
  readonly savingsGoals: typeof savingsGoals;
  readonly sharedReports: typeof sharedReports;
  readonly syncState: typeof syncState;
  readonly tags: typeof tags;
  readonly transactionAttachments: typeof transactionAttachments;
  readonly transactionPhotos: typeof transactionPhotos;
  readonly transactionSplits: typeof transactionSplits;
  readonly transactionTags: typeof transactionTags;
  readonly transactions: typeof transactions;
  readonly transfers: typeof transfers;
  readonly voiceStreamCredits: typeof voiceStreamCredits;
  readonly voiceThreads: typeof voiceThreads;
  readonly voiceTurns: typeof voiceTurns;
  readonly webPushSubscriptions: typeof webPushSubscriptions;
  readonly webhookDeliveries: typeof webhookDeliveries;
  readonly webhookEndpoints: typeof webhookEndpoints;
  readonly webhookEvents: typeof webhookEvents;
  readonly webhookTokens: typeof webhookTokens;
}> = $DatabaseSchema.make({
  accountDeletionJobs,
  accounts,
  appMeta,
  bankAccounts,
  bankEntries,
  bankHolders,
  bankInstitutions,
  budgetPlans,
  budgets,
  captureKeys,
  categories,
  enrichmentJobs,
  exchangeRates,
  groundedSpend,
  inboundWrites,
  installmentPlans,
  installments,
  ledgerCells,
  mailState,
  mainBudget,
  merchantKnowledge,
  openStats,
  outboundEmails,
  outsideMoves,
  outsidePayments,
  photoObjects,
  photoSizes,
  profileInvites,
  profileMembers,
  profiles,
  referralCodes,
  referralRewards,
  referrals,
  savingsGoals,
  sharedReports,
  syncState,
  tags,
  transactionAttachments,
  transactionPhotos,
  transactionSplits,
  transactionTags,
  transactions,
  transfers,
  voiceStreamCredits,
  voiceThreads,
  voiceTurns,
  webPushSubscriptions,
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
  webhookTokens,
});

export default databaseSchema;
