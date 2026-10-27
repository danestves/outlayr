CREATE TABLE `transactionPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`imageUri` text,
	`imageKey` text,
	`imageColor` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactionPhotos_transactionId_idx` ON `transactionPhotos` (`transactionId`);--> statement-breakpoint
CREATE INDEX `transactionPhotos_deletedAt_idx` ON `transactionPhotos` (`deletedAt`);
--> statement-breakpoint
-- Every photo that already exists becomes the entry's first attachment. Without
-- this the new table starts empty and every stored photo is orphaned: the row
-- still names a key, but nothing reads that column any more.
-- `lower(hex(randomblob(16)))` mints the id SQLite-side, because a migration has
-- no access to the app's id generator.
INSERT INTO `transactionPhotos` (`id`, `transactionId`, `imageUri`, `imageKey`, `imageColor`, `sortOrder`, `updatedAt`, `deletedAt`)
SELECT lower(hex(randomblob(16))), `id`, `imageUri`, `imageKey`, `imageColor`, 0, `updatedAt`, `deletedAt`
FROM `transactions`
WHERE `imageUri` IS NOT NULL OR `imageKey` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionPhotos`
AFTER INSERT ON `transactionPhotos`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionPhotos', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionPhotos`
AFTER UPDATE ON `transactionPhotos`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionPhotos', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transactionPhotos`
AFTER DELETE ON `transactionPhotos`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionPhotos' AND `localId` = `old`.`id`;
END;
