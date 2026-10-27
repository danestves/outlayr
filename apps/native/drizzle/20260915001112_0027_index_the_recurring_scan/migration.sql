CREATE INDEX `transactions_recurring_idx` ON `transactions` (`recurringType`) WHERE `deletedAt` IS NULL AND `recurringType` > 0;
