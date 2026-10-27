import { openLanguageSettings } from "@/lib/language-settings";
import { openUrl } from "@/lib/open-url";
import { openStoreReview } from "@/lib/store-links";
import { BANK_SHORTCUT_URL, openShortcutsAutomations, openWalletShortcut } from "@/lib/wallet-shortcut";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export async function runLinkCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

export const openWalletShortcutCommand = createCommand({
    execute: (_input: undefined) => openWalletShortcut(),
    label: "links:open-wallet-shortcut",
});

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
