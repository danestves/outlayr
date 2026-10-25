CREATE TABLE `transactionAttachments` (
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`imageKey` text,
	`imageUri` text,
	`name` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`transactionId` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `transactionAttachments_transactionId_idx` ON `transactionAttachments` (`transactionId`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionAttachments`
AFTER INSERT ON `transactionAttachments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionAttachments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionAttachments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionAttachments`
AFTER UPDATE ON `transactionAttachments`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionAttachments' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionAttachments', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transactionAttachments`
AFTER DELETE ON `transactionAttachments`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionAttachments' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'transactionAttachments'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',transactionAttachments';
