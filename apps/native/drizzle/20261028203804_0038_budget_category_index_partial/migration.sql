DROP INDEX `budgets_categoryId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_categoryId_unique` ON `budgets` (`categoryId`) WHERE `deletedAt` IS NULL;