DROP TABLE `templateTransactions`;--> statement-breakpoint
DELETE FROM `outbox` WHERE `tableName` = 'templateTransactions';
