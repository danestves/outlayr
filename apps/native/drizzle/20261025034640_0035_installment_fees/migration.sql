ALTER TABLE `transactions` ADD `installmentId` text;--> statement-breakpoint
CREATE INDEX `transactions_installmentId_idx` ON `transactions` (`installmentId`) WHERE `installmentId` IS NOT NULL;
