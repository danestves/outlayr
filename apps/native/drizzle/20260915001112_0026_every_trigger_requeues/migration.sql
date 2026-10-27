DROP TRIGGER IF EXISTS `outbox_after_insert_accounts`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_accounts`
AFTER INSERT ON `accounts`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'accounts' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('accounts', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_budgets`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_budgets`
AFTER INSERT ON `budgets`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgets' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgets', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_categories`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_categories`
AFTER INSERT ON `categories`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'categories' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('categories', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_mainBudget`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_mainBudget`
AFTER INSERT ON `mainBudget`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'mainBudget' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('mainBudget', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_savingsGoals`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_savingsGoals`
AFTER INSERT ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'savingsGoals' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_tags`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_tags`
AFTER INSERT ON `tags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'tags' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('tags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_transactionPhotos`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionPhotos`
AFTER INSERT ON `transactionPhotos`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionPhotos' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionPhotos', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_transactionSplits`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionSplits`
AFTER INSERT ON `transactionSplits`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionSplits' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionSplits', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_transactionTags`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionTags`
AFTER INSERT ON `transactionTags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionTags' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionTags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_transactions`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactions`
AFTER INSERT ON `transactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactions' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_insert_transfers`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transfers`
AFTER INSERT ON `transfers`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transfers' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transfers', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_accounts`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_accounts`
AFTER UPDATE ON `accounts`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'accounts' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('accounts', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_budgets`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_budgets`
AFTER UPDATE ON `budgets`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgets' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgets', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_categories`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_categories`
AFTER UPDATE ON `categories`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'categories' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('categories', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_mainBudget`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_mainBudget`
AFTER UPDATE ON `mainBudget`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'mainBudget' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('mainBudget', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_savingsGoals`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_savingsGoals`
AFTER UPDATE ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'savingsGoals' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_tags`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_tags`
AFTER UPDATE ON `tags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'tags' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('tags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_transactionPhotos`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionPhotos`
AFTER UPDATE ON `transactionPhotos`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionPhotos' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionPhotos', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_transactionSplits`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionSplits`
AFTER UPDATE ON `transactionSplits`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionSplits' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionSplits', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_transactionTags`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionTags`
AFTER UPDATE ON `transactionTags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionTags' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionTags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_transactions`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactions`
AFTER UPDATE ON `transactions`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactions' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactions', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_transfers`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transfers`
AFTER UPDATE ON `transfers`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transfers' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transfers', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
