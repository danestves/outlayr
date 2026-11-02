import * as Effect from "effect/Effect";

import { toggleFavouriteCurrency } from "@/data/favourite-currencies-core";
import { saveAiConsent, setBoolSetting, setCurrency, setNumberSetting } from "@/data/settings-core";
import type { BoolSettingKey, NumberSettingKey } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { posthog } from "@/lib/posthog";

import { createCommand } from "./atom-command";

const trackSetting = (setting: string, enabled: boolean) =>
    Effect.tap(() => Effect.sync(() => posthog?.capture("setting_changed", { enabled, setting })));

export const setBoolSettingCommand = createCommand({
    execute: (input: { db: Database; key: BoolSettingKey; value: boolean }) =>
        input.key === "shareAnalytics"
            ? setBoolSetting(input.db, input.key, input.value)
            : setBoolSetting(input.db, input.key, input.value).pipe(trackSetting(input.key, input.value)),
    label: "settings:set-bool",
});

export const setNumberSettingCommand = createCommand({
    execute: (input: { db: Database; key: NumberSettingKey; value: number }) =>
        setNumberSetting(input.db, input.key, input.value),
    label: "settings:set-number",
});

export const saveAiConsentCommand = createCommand({
    execute: (input: { allowed: boolean; db: Database }) =>
        saveAiConsent(input.db, input.allowed).pipe(trackSetting("aiConsent", input.allowed)),
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
