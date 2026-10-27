CREATE TABLE `appMeta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`amount` real NOT NULL,
	`type` integer NOT NULL,
	`startDate` integer,
	`dateCreated` integer,
	`green` integer DEFAULT false NOT NULL,
	`categoryId` text,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_categoryId_unique` ON `budgets` (`categoryId`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`color` text DEFAULT '#FFFFFF',
	`icon` text,
	`emoji` text,
	`income` integer DEFAULT false NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`dateCreated` integer,
	`parentId` text,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `categories_income_idx` ON `categories` (`income`);--> statement-breakpoint
CREATE INDEX `categories_parentId_idx` ON `categories` (`parentId`);--> statement-breakpoint
CREATE TABLE `mainBudget` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`amount` real NOT NULL,
	`type` integer NOT NULL,
	`startDate` integer,
	`dateCreated` integer,
	`green` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE TABLE `templateTransactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`income` integer NOT NULL,
	`note` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`recurringType` integer DEFAULT 0 NOT NULL,
	`recurringCoefficient` integer DEFAULT 1 NOT NULL,
	`categoryId` text,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`income` integer NOT NULL,
	`currency` text,
	`note` text DEFAULT '' NOT NULL,
	`details` text,
	`date` integer NOT NULL,
	`day` integer NOT NULL,
	`month` integer NOT NULL,
	`icon` text,
	`emoji` text,
	`customColor` text,
	`imageColor` text,
	`imageUri` text,
	`onceRecurring` integer DEFAULT false NOT NULL,
	`recurringType` integer DEFAULT 0 NOT NULL,
	`recurringCoefficient` integer DEFAULT 1 NOT NULL,
	`recurringEndDate` integer,
	`categoryId` text,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transactions_day_idx` ON `transactions` (`day`);--> statement-breakpoint
CREATE INDEX `transactions_month_idx` ON `transactions` (`month`);--> statement-breakpoint
CREATE INDEX `transactions_categoryId_idx` ON `transactions` (`categoryId`);--> statement-breakpoint
CREATE INDEX `transactions_deletedAt_idx` ON `transactions` (`deletedAt`);