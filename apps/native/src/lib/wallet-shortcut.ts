import { Linking } from "react-native";

/**
 * Re-share whenever `LogWalletTransactionIntent`'s parameters change: a shortcut snapshots the action. Inside, Currency
 * Code reads off the Amount (never Shortcut Input) and Card is the raw Card or Pass, whose Name is "Payment Method".
 */
export const WALLET_SHORTCUT_URL: string | null = "https://www.icloud.com/shortcuts/8da78a0436dc4e94be4674ca6cb439db";

export const BANK_SHORTCUT_URL = "https://www.icloud.com/shortcuts/e0327cbcd7b34718ba42cae568f0dc12";

/** Undocumented but stable since iOS 17: opens the Automations tab, where the Wallet trigger is created. */
const AUTOMATIONS_URL = "shortcuts://automations";
const SHORTCUTS_URL = "shortcuts://";

export async function openWalletShortcut(): Promise<void> {
    await Linking.openURL(WALLET_SHORTCUT_URL ?? SHORTCUTS_URL);
}

export async function openShortcutsAutomations(): Promise<void> {
    try {
        await Linking.openURL(AUTOMATIONS_URL);
    } catch {
        await Linking.openURL(SHORTCUTS_URL);
    }
}
