CREATE TABLE `savingsGoals` (
	`accountId` text NOT NULL,
	`currency` text NOT NULL,
	`dateCreated` integer NOT NULL,
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`targetAmount` real NOT NULL,
	`targetAmountUsd` real,
	`targetDate` integer,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `savingsGoals_accountId_idx` ON `savingsGoals` (`accountId`);--> statement-breakpoint
CREATE INDEX `savingsGoals_deletedAt_idx` ON `savingsGoals` (`deletedAt`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_savingsGoals`
AFTER INSERT ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_savingsGoals`
AFTER UPDATE ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_savingsGoals`
AFTER DELETE ON `savingsGoals`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'savingsGoals' AND `localId` = `old`.`id`;
END;
