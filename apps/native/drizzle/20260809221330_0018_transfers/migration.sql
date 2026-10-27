CREATE TABLE `transfers` (
	`date` integer NOT NULL,
	`dateCreated` integer NOT NULL,
	`day` integer NOT NULL,
	`deletedAt` integer,
	`exchangeRate` real,
	`exchangeRateType` text,
	`fromAccountId` text NOT NULL REFERENCES accounts(id) ON DELETE cascade,
	`fromAmount` real NOT NULL,
	`fromAmountUsd` real,
	`fromCurrency` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`month` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`toAccountId` text NOT NULL REFERENCES accounts(id) ON DELETE cascade,
	`toAmount` real NOT NULL,
	`toAmountUsd` real,
	`toCurrency` text NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transfers_day_idx` ON `transfers` (`day`);--> statement-breakpoint
CREATE INDEX `transfers_fromAccountId_idx` ON `transfers` (`fromAccountId`);--> statement-breakpoint
CREATE INDEX `transfers_toAccountId_idx` ON `transfers` (`toAccountId`);--> statement-breakpoint
CREATE INDEX `transfers_deletedAt_idx` ON `transfers` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `transfers_day_date_idx` ON `transfers` (`day`,`date`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `transferId` text REFERENCES transfers(id);--> statement-breakpoint
CREATE INDEX `transactions_transferId_idx` ON `transactions` (`transferId`);
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transfers`
AFTER INSERT ON `transfers`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transfers', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transfers`
AFTER UPDATE ON `transfers`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transfers', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transfers`
AFTER DELETE ON `transfers`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transfers' AND `localId` = `old`.`id`;
END;
