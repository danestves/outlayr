import * as Effect from "effect/Effect";
import { Platform } from "react-native";

import { openUrl } from "./open-url";

/**
 * Re-share whenever `LogWalletTransactionIntent`'s parameters change: a shortcut snapshots the action. Inside, Currency
 * Code reads off the Amount (never Shortcut Input) and Card is the raw Card or Pass, whose Name is "Payment Method".
 */
export const WALLET_SHORTCUT_URL: string | null = "https://www.icloud.com/shortcuts/8da78a0436dc4e94be4674ca6cb439db";

/** iOS 27 keeps a shortcut's triggers inside it, so a shared link installs the whole automation. */
export const TRIGGERS_IN_SHORTCUTS = Number.parseInt(String(Platform.Version), 10) >= 27;

export const BANK_SHORTCUT_URL = "https://www.icloud.com/shortcuts/e0327cbcd7b34718ba42cae568f0dc12";

/** Undocumented but stable since iOS 17: opens the Automations tab, where the Wallet trigger is created. */
const AUTOMATIONS_URL = "shortcuts://automations";
const SHORTCUTS_URL = "shortcuts://";

export const openWalletShortcut = () => openUrl(WALLET_SHORTCUT_URL ?? SHORTCUTS_URL);

export const openShortcutsAutomations = () =>
    openUrl(AUTOMATIONS_URL).pipe(Effect.catchTags({ OpenUrlError: () => openUrl(SHORTCUTS_URL) }));
