DROP TRIGGER IF EXISTS `outbox_after_insert_appMeta`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `outbox_after_update_appMeta`;--> statement-breakpoint
CREATE TRIGGER `outbox_after_insert_appMeta`
AFTER INSERT ON `appMeta`
WHEN `new`.`key` IN ('currency', 'currencyChosen', 'showCents', 'incomeTracking', 'showUpcoming', 'showUpcomingSoon', 'logViewLineGraph', 'animatedCharts', 'categorySuggestions', 'aiEnrichment', 'groundedLookup', 'swapTimeLabel', 'confetti', 'budgetViewStyle', 'use24HourClock', 'firstWeekday', 'firstDayOfMonth', 'haptics', 'logInsightsTimeFrame', 'logInsightsType', 'insightsTimeFrame', 'insightsMeasure', 'accentColor') AND (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('appMeta', `new`.`key`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
CREATE TRIGGER `outbox_after_update_appMeta`
AFTER UPDATE ON `appMeta`
WHEN `new`.`key` IN ('currency', 'currencyChosen', 'showCents', 'incomeTracking', 'showUpcoming', 'showUpcomingSoon', 'logViewLineGraph', 'animatedCharts', 'categorySuggestions', 'aiEnrichment', 'groundedLookup', 'swapTimeLabel', 'confetti', 'budgetViewStyle', 'use24HourClock', 'firstWeekday', 'firstDayOfMonth', 'haptics', 'logInsightsTimeFrame', 'logInsightsType', 'insightsTimeFrame', 'insightsMeasure', 'accentColor') AND (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
BEGIN
	INSERT OR REPLACE INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
	VALUES ('appMeta', `new`.`key`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
END;--> statement-breakpoint
DELETE FROM `outbox` WHERE `tableName` = 'appMeta' AND `localId` = 'numberEntryType';
