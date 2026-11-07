import { openLanguageSettings } from "@/lib/language-settings";
import { openUrl, openWebUrl } from "@/lib/open-url";
import { openStoreReview } from "@/lib/store-links";
import { BANK_SHORTCUT_URL, openShortcutsAutomations } from "@/lib/wallet-shortcut";

import { createCommand } from "./atom-command";

export const openBankShortcutCommand = createCommand({
    execute: (_input: undefined) => openUrl(BANK_SHORTCUT_URL),
    label: "links:open-bank-shortcut",
});

export const emailSupportCommand = createCommand({
    execute: (mailto: string) => openUrl(mailto),
    label: "links:email-support",
});

export const openWebLinkCommand = createCommand({
    execute: (url: string) => openWebUrl(url),
    label: "links:open-web-link",
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
