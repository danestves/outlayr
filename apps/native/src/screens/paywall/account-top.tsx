import { isPerson } from "@outlayr/money/account-kind";
import { View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { isInstallmentAppAccount } from "@/domain/institution-map";
import type { PaywallTrigger } from "@/domain/paywall-trigger";
import { FREE_ACCOUNTS, FREE_INSTALLMENT_APPS } from "@/domain/pro-limits";
import { useTranslation } from "@/i18n/context";

const SHOWN_ACCOUNTS = 4;

type AccountTrigger = Extract<typeof PaywallTrigger.Type, "accounts" | "currencies" | "installment_apps">;

export function AccountTop({ trigger }: { trigger: AccountTrigger }) {
    const t = useTranslation();
    const rows = useAccounts(useDatabase()).filter((account) => !isPerson(account));
    const installmentApps = trigger === "installment_apps";
    const listed = rows.filter((account) => isInstallmentAppAccount(account) === installmentApps);
    return (
        <View className="pt-2">
            <MonoLabel>{t("pro.eyebrow")}</MonoLabel>
            <Text className="text-foreground text-title font-sans-semibold pt-2 tracking-tight">
                {trigger === "currencies"
                    ? t("pro.top.currencies.title")
                    : t(installmentApps ? "pro.top.installments" : "pro.top.accounts", {
                          count: listed.length,
                          limit: installmentApps ? FREE_INSTALLMENT_APPS : FREE_ACCOUNTS,
                      })}
            </Text>
            <View className="border-border mt-4 border-t">
                {listed.slice(0, SHOWN_ACCOUNTS).map((account) => (
                    <View className="border-border flex-row items-center gap-3 border-b py-2.5" key={account.id}>
                        <AccountTile account={account} size={32} />
                        <Text className="text-foreground text-subtitle flex-1" numberOfLines={1}>
                            {account.name}
                        </Text>
                        <Text className="text-muted text-footnote font-mono">{account.currency}</Text>
                    </View>
                ))}
            </View>
            {trigger === "currencies" ? (
                <Text className="text-muted text-footnote pt-3">{t("pro.top.currencies.note")}</Text>
            ) : null}
        </View>
    );
}
