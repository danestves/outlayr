import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { formatSentenceDate } from "@/domain/dates";
import { accountTitle, BANK_LINK_ROUTE, needsSignIn } from "@/domain/linked-banks";
import type { LinkedBankAccount } from "@/domain/linked-banks";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLanguage, useTranslation } from "@/i18n/context";
import { STRIPE_READY } from "@/lib/stripe-link";
import { BankMark } from "@/screens/settings/bank-parts";

export function LogBankRelink() {
    const overview = useBankOverview();
    const account = STRIPE_READY ? needsSignIn(overview) : null;
    if (overview.kind !== "ready" || account === null) {
        return null;
    }
    return <RelinkBanner account={account} />;
}

function RelinkBanner({ account }: { account: LinkedBankAccount }) {
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();

    const name = accountTitle(account);
    const detail =
        account.pulledAt === null
            ? t("log.banks.relinkPaused", { account: name })
            : t("log.banks.relinkDetail", {
                  account: name,
                  date: formatSentenceDate(new Date(account.pulledAt), language),
              });

    return (
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
                onPress={() => router.push({ pathname: BANK_LINK_ROUTE, params: { q: account.institution } })}
            >
                <Text className="text-foreground text-body font-sans-semibold">{t("settings.banks.signIn")}</Text>
            </Pressable>
        </View>
    );
}
