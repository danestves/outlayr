CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE INDEX `tags_deletedAt_idx` ON `tags` (`deletedAt`);--> statement-breakpoint
CREATE TABLE `transactionTags` (
	`id` text PRIMARY KEY NOT NULL,
	`transactionId` text NOT NULL,
	`tagId` text NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactionTags_transactionId_idx` ON `transactionTags` (`transactionId`);--> statement-breakpoint
CREATE INDEX `transactionTags_tagId_idx` ON `transactionTags` (`tagId`);--> statement-breakpoint
CREATE INDEX `transactionTags_deletedAt_idx` ON `transactionTags` (`deletedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `transactionTags_pair_idx` ON `transactionTags` (`transactionId`,`tagId`);
--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_tags`
AFTER INSERT ON `tags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('tags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_tags`
AFTER UPDATE ON `tags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('tags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_tags`
AFTER DELETE ON `tags`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'tags' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_transactionTags`
AFTER INSERT ON `transactionTags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionTags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_transactionTags`
AFTER UPDATE ON `transactionTags`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('transactionTags', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;
--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_transactionTags`
AFTER DELETE ON `transactionTags`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'transactionTags' AND `localId` = `old`.`id`;
END;
