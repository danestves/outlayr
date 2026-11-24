ALTER TABLE `transactions` ADD `createdBy` text;--> statement-breakpoint
ALTER TABLE `transfers` ADD `createdBy` text;--> statement-breakpoint
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncReread', 'transactions,transfers'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor')
ON CONFLICT (`key`) DO UPDATE SET `value` = `value` || ',transactions,transfers';