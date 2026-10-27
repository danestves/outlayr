PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_savingsGoals` (
	`accountId` text NOT NULL,
	`currency` text NOT NULL,
	`dateCreated` integer NOT NULL,
	`deletedAt` integer,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`startAmount` real DEFAULT 0 NOT NULL,
	`startAmountUsd` real,
	`exchangeRate` real,
	`targetAmount` real NOT NULL,
	`targetAmountUsd` real,
	`targetDate` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
--> The new columns do not exist on the old table, so they are supplied here
--> rather than selected. `startAmount` opens at 0: the balance an existing goal
--> was set against was never recorded, and 0 states the line from nothing rather
--> than inventing an anchor. Its USD twin is 0 too, NOT null — zero is exactly
--> zero in every currency, and a null would be read as a failed conversion and
--> withhold the goal's figures for as long as the display currency differed.
-->
--> `exchangeRate` is recovered from the pair the goal already carries, which is
--> the only record left of the rate it was valued at: the daily history it came
--> from is pruned to one row per month outside the 90-day window, so re-querying
--> the creation date can resolve to a different day's rate entirely.
-->
--> A goal now carries a date by definition, so a dateless one cannot survive as
--> it is. It is TOMBSTONED rather than dropped, dated from its own creation.
--> Dropping the row would leave nothing to carry the removal: a device that had
--> already synced would consider the goal gone while the server and every other
--> device kept it, and would never pull the unchanged row again to find out. An
--> already-deleted dateless row is kept for the same reason — its row exists only
--> to carry a tombstone that has yet to be pushed.
INSERT INTO `__new_savingsGoals`("accountId", "currency", "dateCreated", "deletedAt", "id", "name", "sortOrder", "startAmount", "startAmountUsd", "exchangeRate", "targetAmount", "targetAmountUsd", "targetDate", "updatedAt") SELECT "accountId", "currency", "dateCreated", CASE WHEN "targetDate" IS NULL THEN COALESCE("deletedAt", CAST(strftime('%s', 'now') AS INTEGER) * 1000) ELSE "deletedAt" END, "id", "name", "sortOrder", 0, 0, CASE WHEN "targetAmountUsd" IS NOT NULL AND "targetAmountUsd" != 0 AND "targetAmount" != 0 THEN "targetAmount" / "targetAmountUsd" END, "targetAmount", "targetAmountUsd", COALESCE("targetDate", "dateCreated"), CASE WHEN "targetDate" IS NULL AND "deletedAt" IS NULL THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000 ELSE "updatedAt" END FROM `savingsGoals`;--> statement-breakpoint
--> Queued by hand, because the tombstone above is written by this migration and
--> not by the trigger that would otherwise notice it — and an unpushed removal is
--> one the server never hears about. Read from the OLD table, which still knows
--> which rows were live and dateless, and gated on the same `syncEnabled` the
--> triggers check so a ledger that never syncs does not accrue a queue.
INSERT OR REPLACE INTO `outbox` ("tableName", "localId", "enqueuedAt") SELECT 'savingsGoals', "id", CAST(strftime('%s', 'now') AS INTEGER) * 1000 FROM `savingsGoals` WHERE "targetDate" IS NULL AND "deletedAt" IS NULL AND (SELECT "value" FROM `appMeta` WHERE "key" = 'syncEnabled') = '1';--> statement-breakpoint
DROP TABLE `savingsGoals`;--> statement-breakpoint
ALTER TABLE `__new_savingsGoals` RENAME TO `savingsGoals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `savingsGoals_accountId_idx` ON `savingsGoals` (`accountId`);--> statement-breakpoint
CREATE INDEX `savingsGoals_deletedAt_idx` ON `savingsGoals` (`deletedAt`);--> statement-breakpoint
--> The rebuild above dropped the table, and a trigger goes with its table. These
--> are `0021_savings_goals`'s verbatim: a goal that stops enqueuing to the outbox
--> stops syncing, silently.
CREATE TRIGGER `outbox_after_insert_savingsGoals`
AFTER INSERT ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_savingsGoals`
AFTER UPDATE ON `savingsGoals`
WHEN (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('savingsGoals', `new`.`id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_delete_savingsGoals`
AFTER DELETE ON `savingsGoals`
BEGIN
	DELETE FROM `outbox` WHERE `tableName` = 'savingsGoals' AND `localId` = `old`.`id`;
END;
