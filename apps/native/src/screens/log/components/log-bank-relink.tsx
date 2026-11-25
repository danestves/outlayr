import { Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { Text } from "@/components/text";
import { formatSentenceDate } from "@/domain/dates";
import { accountTitle, defaultCountry, needsSignIn } from "@/domain/linked-banks";
import type { LinkedBankAccount } from "@/domain/linked-banks";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLongWait } from "@/hooks/use-long-wait";
import { useRegionCode } from "@/hooks/use-region-code";
import { useLanguage, useTranslation } from "@/i18n/context";
import { STRIPE_READY } from "@/lib/stripe-link";
import { BankMark, useBankLink } from "@/screens/settings/bank-parts";
import { useColors } from "@/theme/use-colors";

export function LogBankRelink() {
    const overview = useBankOverview();
    const region = useRegionCode();
    const account = STRIPE_READY ? needsSignIn(overview) : null;
    if (overview.kind !== "ready" || account === null) {
        return null;
    }
    const country = defaultCountry(overview.overview.countries, region);
    return country === null ? null : (
        <RelinkBanner account={account} accounts={overview.overview.accounts} country={country} />
    );
}

function RelinkBanner({
    account,
    accounts,
    country,
}: {
    account: LinkedBankAccount;
    accounts: readonly LinkedBankAccount[];
    country: string;
}) {
    const bankLink = useBankLink(accounts);
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const slow = useLongWait(bankLink.busy);

    const name = accountTitle(account);
    const detail =
        account.pulledAt === null
            ? t("log.banks.relinkPaused", { account: name })
            : t("log.banks.relinkDetail", {
                  account: name,
                  date: formatSentenceDate(new Date(account.pulledAt), language),
              });

    return (
        <>
            <View className="border-border my-2 flex-row items-center gap-3 border-b py-3">
                <BankMark institution={account.institution} size={28} />
                <View className="flex-1 gap-0.5">
                    <Text className="text-foreground text-body font-sans-semibold" numberOfLines={1}>
                        {t("log.banks.relinkTitle", { bank: account.institution })}
                    </Text>
                    <Text className="text-danger text-subtitle" numberOfLines={2}>
                        {detail}
                    </Text>
                </View>
                <Pressable
                    accessibilityRole="button"
                    className="bg-surface rounded-full px-4 py-2 active:opacity-60"
                    disabled={bankLink.busy}
                    onPress={() => bankLink.link(country)}
                >
                    {slow ? (
                        <BusyText className="text-body font-sans-semibold" color={colors.foreground}>
                            {t("settings.banks.entry.busy")}
                        </BusyText>
                    ) : (
                        <Text className="text-foreground text-body font-sans-semibold">
                            {t("settings.banks.signIn")}
                        </Text>
                    )}
                </Pressable>
            </View>
            {bankLink.sheets}
        </>
    );
}
