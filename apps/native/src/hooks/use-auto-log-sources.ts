import * as Cause from "effect/Cause";

import type { SettingsIconName } from "@/components/settings/settings-icons";
import { useWalletMeta } from "@/data/use-wallet-meta";
import type { Database } from "@/db/client";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { TRIGGERS_IN_SHORTCUTS } from "@/lib/wallet-shortcut";
import { SILENT } from "@/state/atom-command";
import { openBankShortcutCommand } from "@/state/link-commands";
import { getWalletShortcutCommand } from "@/state/settings-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

export interface AutoLogSource {
    detail: string;
    icon: SettingsIconName;
    id: string;
    on: boolean;
    onSetUp?: () => void;
    title: string;
}

const SIRI_PHRASE = "“Log an expense in Outlayr”";

export function useAutoLogSources(db: Database): AutoLogSource[] {
    const t = useTranslation();
    const { applePayOn, lastNotification } = useWalletMeta(db);
    const openWalletShortcut = useAtomAction(
        getWalletShortcutCommand,
        {
            onFailure: (cause) => {
                console.error("Opening the Wallet shortcut failed", Cause.squash(cause));
                notifyFailure({ title: t("settings.wallet.get") });
            },
        },
        SILENT
    );
    const openBankShortcut = useAtomAction(
        openBankShortcutCommand,
        {
            onFailure: (cause) => {
                console.error("Opening the bank shortcut failed", Cause.squash(cause));
                notifyFailure({ title: t("settings.wallet.bankGet") });
            },
        },
        SILENT
    );

    const siri: AutoLogSource = { detail: SIRI_PHRASE, icon: "Mic01", id: "siri", on: true, title: "Siri" };
    if (!TRIGGERS_IN_SHORTCUTS) {
        return [siri];
    }

    return [
        {
            detail: t("onboarding.autoLog.applePay.detail"),
            icon: "Wallet01",
            id: "applePay",
            on: applePayOn,
            onSetUp: () => openWalletShortcut(db),
            title: t("nav.settings.wallet"),
        },
        {
            detail: t("onboarding.autoLog.bank.detail"),
            icon: "Bank",
            id: "bank",
            on: lastNotification != null,
            onSetUp: () => openBankShortcut(undefined),
            title: t("settings.wallet.bankSection"),
        },
        siri,
    ];
}
