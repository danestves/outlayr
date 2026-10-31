CREATE TABLE `budgetPlans` (
	`amount` real,
	`categoryId` text NOT NULL,
	`currency` text,
	`deletedAt` integer,
	`id` text PRIMARY KEY,
	`month` integer NOT NULL,
	`restoredAt` integer,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_budgetPlans_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `budgetPlans_categoryId_idx` ON `budgetPlans` (`categoryId`);--> statement-breakpoint
CREATE INDEX `budgetPlans_month_idx` ON `budgetPlans` (`month`);--> statement-breakpoint
CREATE INDEX `budgetPlans_deletedAt_idx` ON `budgetPlans` (`deletedAt`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_budgetPlans`
AFTER INSERT ON `budgetPlans`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgetPlans' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgetPlans', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_budgetPlans`
AFTER UPDATE ON `budgetPlans`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgetPlans' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('budgetPlans', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_budgetPlans`
AFTER DELETE ON `budgetPlans`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'budgetPlans' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'budgetPlans'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',budgetPlans';
