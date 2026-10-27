CREATE TABLE `exchangeRates` (
	`quote` text NOT NULL,
	`rateType` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	`source` text NOT NULL,
	`fetchedAt` integer NOT NULL,
	PRIMARY KEY(`quote`, `rateType`, `date`)
);
