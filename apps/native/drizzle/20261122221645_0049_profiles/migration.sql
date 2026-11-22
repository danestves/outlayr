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
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'profiles'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',profiles';
