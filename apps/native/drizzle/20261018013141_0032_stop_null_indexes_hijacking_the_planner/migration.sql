DROP INDEX `transactions_deletedAt_idx`;--> statement-breakpoint
DROP INDEX `transfers_deletedAt_idx`;--> statement-breakpoint
DROP INDEX `transactionSplits_deletedAt_idx`;--> statement-breakpoint
DROP INDEX `transactionTags_deletedAt_idx`;--> statement-breakpoint
DROP INDEX `transactionPhotos_deletedAt_idx`;--> statement-breakpoint
CREATE INDEX `transactions_tombstone_idx` ON `transactions` (`deletedAt`) WHERE `deletedAt` IS NOT NULL;--> statement-breakpoint
DROP INDEX `transactions_feeForId_idx`;--> statement-breakpoint
CREATE INDEX `transactions_feeForId_idx` ON `transactions` (`feeForId`) WHERE `feeForId` IS NOT NULL;--> statement-breakpoint
DROP INDEX `transactions_transferId_idx`;--> statement-breakpoint
CREATE INDEX `transactions_transferId_idx` ON `transactions` (`transferId`) WHERE `transferId` IS NOT NULL;
