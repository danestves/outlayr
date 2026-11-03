ALTER TABLE `outsideMoves` ADD `adjustment` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `outsideMoves` SET `adjustment` = 1, `updatedAt` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE `deletedAt` IS NULL
	AND `note` IN ('Balance adjustment', 'Ajuste de saldo', 'Ajustement du solde')
	AND `accountId` IN (SELECT `id` FROM `accounts` WHERE `kind` <> 'person');
