import { openLanguageSettings } from "@/lib/language-settings";
import { openUrl } from "@/lib/open-url";
import { openStoreReview } from "@/lib/store-links";
import { BANK_SHORTCUT_URL, openShortcutsAutomations } from "@/lib/wallet-shortcut";

import { createCommand } from "./atom-command";

export const openBankShortcutCommand = createCommand({
    execute: (_input: undefined) => openUrl(BANK_SHORTCUT_URL),
    label: "links:open-bank-shortcut",
});

export const openShortcutsAutomationsCommand = createCommand({
    execute: (_input: undefined) => openShortcutsAutomations(),
    label: "links:open-shortcuts-automations",
});

export const openStoreReviewCommand = createCommand({
    execute: (_input: undefined) => openStoreReview(),
    label: "links:open-store-review",
});

export const openLanguageSettingsCommand = createCommand({
    execute: (_input: undefined) => openLanguageSettings(),
    label: "links:open-language-settings",
});
