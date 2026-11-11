import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useTranslation } from "@/i18n/context";
import { purchaseListener } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";

import { SourceRow } from "./source-row";

export function MessageSenders() {
    const t = useTranslation();
    const [listener, refreshListener] = usePurchaseListener();
    const texts = listener.senders.flatMap((sender) =>
        sender.from === null ? [] : [{ ...sender, from: sender.from }]
    );

    const toggle = (from: string, on: boolean) => {
        purchaseListener?.setSender(from, on);
        refreshListener();
    };

    return (
        <SettingsScreen>
            <SettingsSection footer={t("settings.wallet.sendersFooter")} title={t("settings.wallet.sendersSection")}>
                {texts.map((sender) => (
                    <SourceRow
                        key={sender.from}
                        label={sender.from}
                        lines={2}
                        on={sender.on}
                        onToggle={(on) => toggle(sender.from, on)}
                        text={sender.text}
                    />
                ))}
            </SettingsSection>
        </SettingsScreen>
    );
}
