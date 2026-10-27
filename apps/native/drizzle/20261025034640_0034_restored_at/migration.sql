ALTER TABLE `transactions` ADD `restoredAt` integer;--> statement-breakpoint
ALTER TABLE `transactionTags` ADD `restoredAt` integer;--> statement-breakpoint
ALTER TABLE `installmentPlans` ADD `restoredAt` integer;--> statement-breakpoint
ALTER TABLE `installments` ADD `restoredAt` integer;--> statement-breakpoint
ALTER TABLE `outsidePayments` ADD `restoredAt` integer;--> statement-breakpoint
-- A build before `restoredAt` rejected every restored row it pulled, and its
-- cursor has moved past them. The sync engine re-reads the restorable tables
-- once for those rows (`syncRestoresReread`) on a device that synced.
INSERT INTO `appMeta` (`key`, `value`)
SELECT 'syncRestoresReread', '1'
WHERE EXISTS (SELECT 1 FROM `appMeta` WHERE `key` = 'syncCursor');
