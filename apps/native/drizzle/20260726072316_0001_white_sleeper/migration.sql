CREATE INDEX `budgets_deletedAt_idx` ON `budgets` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `categories_deletedAt_idx` ON `categories` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `mainBudget_deletedAt_idx` ON `mainBudget` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `templateTransactions_deletedAt_idx` ON `templateTransactions` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_day_date_idx` ON `transactions` (`day`,`date`);