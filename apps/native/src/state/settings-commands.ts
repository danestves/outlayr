import { getMeta, setMeta } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { toggleFavouriteCurrency } from "@/data/favourite-currencies-core";
import {
    readBoolSetting,
    readNumberSetting,
    readRemoteEnrichment,
    saveAiConsent,
    setBoolSetting,
    setCurrency,
    setNumberSetting,
} from "@/data/settings-core";
import type { BoolSettingKey, NumberSettingKey } from "@/data/settings-core";
import type { Database } from "@/db/client";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export const getMetaCommand = createCommand({
    execute: (input: { db: SpendDb; key: string }) => getMeta(input.db, input.key),
    label: "meta:get",
});

export const setMetaCommand = createCommand({
    execute: (input: { db: SpendDb; key: string; value: string }) => setMeta(input.db, input.key, input.value),
    label: "meta:set",
});

export const readBoolSettingCommand = createCommand({
    execute: (input: { db: Database; key: BoolSettingKey }) => readBoolSetting(input.db, input.key),
    label: "settings:read-bool",
});

export const readNumberSettingCommand = createCommand({
    execute: (input: { db: Database; key: NumberSettingKey }) => readNumberSetting(input.db, input.key),
    label: "settings:read-number",
});

export const readRemoteEnrichmentCommand = createCommand({
    execute: (db: Database) => readRemoteEnrichment(db),
    label: "settings:read-remote-enrichment",
});

export const setBoolSettingCommand = createCommand({
    execute: (input: { db: Database; key: BoolSettingKey; value: boolean }) =>
        setBoolSetting(input.db, input.key, input.value),
    label: "settings:set-bool",
});

export const setNumberSettingCommand = createCommand({
    execute: (input: { db: Database; key: NumberSettingKey; value: number }) =>
        setNumberSetting(input.db, input.key, input.value),
    label: "settings:set-number",
});

export const saveAiConsentCommand = createCommand({
    execute: (input: { allowed: boolean; db: Database }) => saveAiConsent(input.db, input.allowed),
    label: "settings:save-ai-consent",
});

export const setCurrencyCommand = createCommand({
    execute: (input: { code: string; db: Database }) => setCurrency(input.db, input.code),
    label: "settings:set-currency",
});

export const toggleFavouriteCurrencyCommand = createCommand({
    execute: (input: { code: string; db: Database }) => toggleFavouriteCurrency(input.db, input.code),
    label: "settings:toggle-favourite-currency",
});

export async function runSettingsCommand<W, A>(command: AtomCommand<W, A, unknown>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}
