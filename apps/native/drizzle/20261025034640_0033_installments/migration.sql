CREATE TABLE `installmentPlans` (
	`accountId` text NOT NULL,
	`dateCreated` integer NOT NULL,
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `installmentPlans_accountId_idx` ON `installmentPlans` (`accountId`);--> statement-breakpoint
CREATE INDEX `installmentPlans_transactionId_idx` ON `installmentPlans` (`transactionId`);--> statement-breakpoint
CREATE TABLE `installments` (
	`amount` real NOT NULL,
	`deletedAt` integer,
	`dueDate` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`planId` text NOT NULL,
	`sequence` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`planId`) REFERENCES `installmentPlans`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `installments_planId_idx` ON `installments` (`planId`);--> statement-breakpoint
CREATE INDEX `installments_dueDate_idx` ON `installments` (`dueDate`);--> statement-breakpoint
CREATE TABLE `outsidePayments` (
	`amount` real NOT NULL,
	`amountUsd` real,
	`date` integer NOT NULL,
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`planId` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`planId`) REFERENCES `installmentPlans`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `outsidePayments_planId_idx` ON `outsidePayments` (`planId`);--> statement-breakpoint
ALTER TABLE `transfers` ADD `installmentPlanId` text;--> statement-breakpoint
CREATE INDEX `transfers_installmentPlanId_idx` ON `transfers` (`installmentPlanId`) WHERE `installmentPlanId` IS NOT NULL;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_installmentPlans`
AFTER INSERT ON `installmentPlans`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installmentPlans' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('installmentPlans', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_installmentPlans`
AFTER UPDATE ON `installmentPlans`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installmentPlans' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('installmentPlans', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_installmentPlans`
AFTER DELETE ON `installmentPlans`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installmentPlans' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_installments`
AFTER INSERT ON `installments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('installments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_installments`
AFTER UPDATE ON `installments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('installments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_installments`
AFTER DELETE ON `installments`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'installments' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_outsidePayments`
AFTER INSERT ON `outsidePayments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsidePayments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('outsidePayments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_outsidePayments`
AFTER UPDATE ON `outsidePayments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsidePayments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('outsidePayments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_outsidePayments`
AFTER DELETE ON `outsidePayments`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsidePayments' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
-- A build without these tables skipped their rows on pull and dropped
-- `transfers.installmentPlanId`, and its cursor has moved past both. The sync
-- engine re-reads just those tables once (`syncReread`) on a device that synced.
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'installmentPlans,installments,outsidePayments,transfers'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor');
