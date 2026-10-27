--> Migration 0011 inserted the back-filled `transactionPhotos` rows and only THEN
--> created `outbox_after_insert_transactionPhotos`, so nothing enqueued them: a
--> photo that predates that migration has never been offered to the server, and
--> nothing re-offers it until the row is edited. 0024 is the counterexample — it
--> queues by hand for exactly this reason.
-->
--> Repaired rather than left alone because the bytes are already uploaded; it is
--> only the pointer row that never replicated. Gated on the same `syncEnabled` the
--> triggers check, and skipping anything already queued so a pending edit keeps
--> its own `seq`.
INSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)
SELECT 'transactionPhotos', `id`, CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM `transactionPhotos`
WHERE (SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'
  AND NOT EXISTS (
    SELECT 1 FROM `outbox`
    WHERE `outbox`.`tableName` = 'transactionPhotos' AND `outbox`.`localId` = `transactionPhotos`.`id`
  );
