import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Pressable, View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { MONO_LABEL_CLASS, MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

/** Why nothing is for sale: no account to attach Pro to, or a build with no backend to deliver it. */
export function SaleBlockers({ needsAccount, noCloud }: { needsAccount: boolean; noCloud: boolean }) {
    const t = useTranslation();
    const router = useRouter();
    return (
        <>
            {needsAccount ? (
                <View className="gap-4 px-5 pt-5">
                    <Text className="text-muted text-subtitle text-center">{t("pro.needsAccount")}</Text>
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() => router.push("/settings/account")}
                        size="md"
                        testID="paywall-sign-in"
                        variant="primary"
                    >
                        {t("settings.account.signIn")}
                    </Button>
                </View>
            ) : null}
            {noCloud ? (
                <View className="items-center px-5 pt-5">
                    <Text className="text-muted text-subtitle text-center" testID="paywall-no-cloud">
                        {t("pro.needsCloud")}
                    </Text>
                </View>
            ) : null}
        </>
    );
}

/** For a customer the store calls Pro whose account has not been told yet. */
export function UnconfirmedNotice({
    checking,
    disabled,
    onConfirm,
}: {
    checking: boolean;
    disabled: boolean;
    onConfirm: () => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <>
            <Text className="text-muted text-subtitle text-center" testID="paywall-unconfirmed">
                {t("pro.unconfirmed")}
            </Text>
            <Pressable accessibilityRole="button" disabled={disabled} onPress={onConfirm} testID="paywall-confirm">
                {checking ? (
                    <BusyText className={MONO_LABEL_CLASS} color={colors.foreground}>
                        {t("pro.checking")}
                    </BusyText>
                ) : (
                    <MonoLabel className="text-foreground">{t("pro.retry")}</MonoLabel>
                )}
            </Pressable>
        </>
    );
}

export function PurchaseFailure({ message }: { message: string }) {
    return (
        <View className="px-5 pt-3">
            <Text className="text-danger text-footnote text-center" testID="paywall-failure">
                {message}
            </Text>
        </View>
    );
}
