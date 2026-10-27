ALTER TABLE `transactions` ADD `feeForId` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `feeRate` real;--> statement-breakpoint
CREATE INDEX `transactions_feeForId_idx` ON `transactions` (`feeForId`);
