CREATE TABLE `profiles` (
	`customColor` text,
	`dateCreated` integer NOT NULL,
	`deletedAt` integer,
	`emoji` text,
	`icon` text,
	`id` text PRIMARY KEY,
	`imageColor` text,
	`imageKey` text,
	`imageUri` text,
	`name` text NOT NULL,
	`restoredAt` integer,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profiles_deletedAt_idx` ON `profiles` (`deletedAt`);--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_profiles`
AFTER INSERT ON `profiles`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'profiles' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('profiles', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_profiles`
AFTER UPDATE ON `profiles`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'profiles' AND `localId` = `new`.`id`;
	INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('profiles', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_profiles`
AFTER DELETE ON `profiles`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'profiles' AND `localId` = `old`.`id`;
END;--> statement-breakpoint
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'profiles'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',profiles';
