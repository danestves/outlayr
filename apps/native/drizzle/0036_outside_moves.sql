CREATE TABLE `outsideMoves` (
	`accountId` text NOT NULL,
	`amount` real NOT NULL,
	`amountUsd` real,
	`date` integer NOT NULL,
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`restoredAt` integer,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `outsideMoves_accountId_idx` ON `outsideMoves` (`accountId`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_outsideMoves`
AFTER INSERT ON `outsideMoves`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsideMoves' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('outsideMoves', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_outsideMoves`
AFTER UPDATE ON `outsideMoves`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsideMoves' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('outsideMoves', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_outsideMoves`
AFTER DELETE ON `outsideMoves`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'outsideMoves' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'outsideMoves'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',outsideMoves';
