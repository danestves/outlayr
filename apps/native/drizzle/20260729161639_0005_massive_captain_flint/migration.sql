CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tableName` text NOT NULL,
	`localId` text NOT NULL,
	`enqueuedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_row_idx` ON `outbox` (`tableName`,`localId`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_categories`
AFTER INSERT ON `categories`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('categories', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_categories`
AFTER UPDATE ON `categories`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('categories', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_categories`
AFTER DELETE ON `categories`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'categories' AND `localId` = `old`.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactions`
AFTER INSERT ON `transactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactions`
AFTER UPDATE ON `transactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transactions`
AFTER DELETE ON `transactions`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactions' AND `localId` = `old`.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_budgets`
AFTER INSERT ON `budgets`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgets', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_budgets`
AFTER UPDATE ON `budgets`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgets', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_budgets`
AFTER DELETE ON `budgets`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgets' AND `localId` = `old`.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_mainBudget`
AFTER INSERT ON `mainBudget`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('mainBudget', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_mainBudget`
AFTER UPDATE ON `mainBudget`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('mainBudget', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_mainBudget`
AFTER DELETE ON `mainBudget`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'mainBudget' AND `localId` = `old`.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_templateTransactions`
AFTER INSERT ON `templateTransactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('templateTransactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_templateTransactions`
AFTER UPDATE ON `templateTransactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('templateTransactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_templateTransactions`
AFTER DELETE ON `templateTransactions`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'templateTransactions' AND `localId` = `old`.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_appMeta`
AFTER INSERT ON `appMeta`
WHEN `new`.`key` IN ('currency', 'currencyChosen') AND (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('appMeta', `new`.`key`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_appMeta`
AFTER UPDATE ON `appMeta`
WHEN `new`.`key` IN ('currency', 'currencyChosen') AND (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('appMeta', `new`.`key`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_appMeta`
AFTER DELETE ON `appMeta`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'appMeta' AND `localId` = `old`.`key`;
END;
