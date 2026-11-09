import { sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import type { Database } from "./client";
import { bootTransaction } from "./transaction";

export interface OutboxTriggerSpec {
    readonly id: SQLiteColumn;
    readonly syncedIds: readonly string[] | undefined;
}

interface OutboxTrigger {
    readonly name: string;
    readonly sql: string;
}

const SYNC_ENABLED = "(SELECT `value` FROM `appMeta` WHERE `key` = 'syncEnabled') = '1'";

const ENQUEUE = [
    "CREATE TRIGGER `outbox_after_{event}_{table}`",
    "AFTER {EVENT} ON `{table}`",
    "WHEN {when}",
    "BEGIN",
    "\tDELETE FROM `outbox` WHERE `tableName` = '{table}' AND `localId` = `new`.`{id}`;",
    "\tINSERT INTO `outbox` (`tableName`, `localId`, `enqueuedAt`)",
    "\tVALUES ('{table}', `new`.`{id}`, CAST(strftime('%s', 'now') AS INTEGER) * 1000);",
    "END",
].join("\n");

const FORGET = [
    "CREATE TRIGGER `outbox_after_delete_{table}`",
    "AFTER DELETE ON `{table}`",
    "BEGIN",
    "\tDELETE FROM `outbox` WHERE `tableName` = '{table}' AND `localId` = `old`.`{id}`;",
    "END",
].join("\n");

const fill = (template: string, values: Readonly<Record<string, string>>): string =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);

function tableTriggers(table: string, { id, syncedIds }: OutboxTriggerSpec): OutboxTrigger[] {
    const allowed = syncedIds?.map((syncedId) => `'${syncedId}'`).join(", ");
    const when = allowed === undefined ? SYNC_ENABLED : `\`new\`.\`${id.name}\` IN (${allowed}) AND ${SYNC_ENABLED}`;
    const enqueue = (["insert", "update"] as const).map((event) => ({
        name: `outbox_after_${event}_${table}`,
        sql: fill(ENQUEUE, { EVENT: event.toUpperCase(), event, id: id.name, table, when }),
    }));
    return [...enqueue, { name: `outbox_after_delete_${table}`, sql: fill(FORGET, { id: id.name, table }) }];
}

export const outboxTriggers = (specs: Readonly<Record<string, OutboxTriggerSpec>>): OutboxTrigger[] =>
    Object.entries(specs).flatMap(([table, spec]) => tableTriggers(table, spec));

export function ensureOutboxTriggers(db: Database, specs: Readonly<Record<string, OutboxTriggerSpec>>): void {
    const wanted = outboxTriggers(specs);
    const held = db.all<OutboxTrigger>(
        sql`SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name GLOB 'outbox_after_*'`
    );
    const wantedSql = new Map(wanted.map((trigger) => [trigger.name, trigger.sql]));
    const stale = held.filter((trigger) => wantedSql.get(trigger.name) !== trigger.sql);
    const staleNames = new Set(stale.map((trigger) => trigger.name));
    const current = new Set(held.filter((trigger) => !staleNames.has(trigger.name)).map((trigger) => trigger.name));
    const missing = wanted.filter((trigger) => !current.has(trigger.name));
    if (stale.length === 0 && missing.length === 0) {
        return;
    }
    bootTransaction(db, () => {
        for (const trigger of stale) {
            db.run(sql`DROP TRIGGER ${sql.identifier(trigger.name)}`);
        }
        for (const trigger of missing) {
            db.run(sql.raw(trigger.sql));
        }
    });
}
