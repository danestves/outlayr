CREATE TABLE `transactionSplits` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`categoryId` text,
	`amount` real NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactionSplits_transactionId_idx` ON `transactionSplits` (`transactionId`);--> statement-breakpoint
CREATE INDEX `transactionSplits_categoryId_idx` ON `transactionSplits` (`categoryId`);--> statement-breakpoint
CREATE INDEX `transactionSplits_deletedAt_idx` ON `transactionSplits` (`deletedAt`);
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionSplits`
AFTER INSERT ON `transactionSplits`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionSplits', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionSplits`
AFTER UPDATE ON `transactionSplits`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionSplits', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transactionSplits`
AFTER DELETE ON `transactionSplits`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionSplits' AND `localId` = `old`.`id`;
END;
