DROP INDEX `transactionTags_pair_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `transactionTags_pair_idx` ON `transactionTags` (`transactionId`,`tagId`) WHERE `deletedAt` IS NULL;
