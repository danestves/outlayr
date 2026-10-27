CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`initialBalance` real DEFAULT 0 NOT NULL,
	`initialBalanceUsd` real,
	`initialBalanceDate` integer NOT NULL,
	`icon` text,
	`emoji` text,
	`customColor` text,
	`imageColor` text,
	`imageUri` text,
	`imageKey` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`dateCreated` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE INDEX `accounts_deletedAt_idx` ON `accounts` (`deletedAt`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `accountId` text REFERENCES accounts(id);--> statement-breakpoint
CREATE INDEX `transactions_accountId_idx` ON `transactions` (`accountId`);
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_accounts`
AFTER INSERT ON `accounts`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('accounts', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_accounts`
AFTER UPDATE ON `accounts`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('accounts', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_accounts`
AFTER DELETE ON `accounts`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'accounts' AND `localId` = `old`.`id`;
END;