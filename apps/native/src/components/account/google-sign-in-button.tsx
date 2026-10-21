import { useTheme } from "panelui-native/theme";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { SIGN_IN_BUTTON_HEIGHT } from "@/components/account/apple-sign-in-button";
import { BusyText } from "@/components/busy-text";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";

// Fixed by Google's identity guidelines, so literals rather than theme tokens.
export const BRAND = {
    dark: { background: "#131314", border: "#8E918F", label: "#E3E3E3" },
    light: { background: "#FFFFFF", border: "#747775", label: "#1F1F1F" },
} as const;

const LOGO = 20;

function GoogleLogo() {
    return (
        <Svg height={LOGO} viewBox="0 0 24 24" width={LOGO}>
            <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </Svg>
    );
}

export function GoogleSignInButton({
    pending,
    disabled,
    onPress,
}: {
    pending: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    const t = useTranslation();
    const { theme } = useTheme();
    const brand = theme === "dark" ? BRAND.dark : BRAND.light;

    return (
        <Pressable
            accessibilityLabel={t("auth.google.continue")}
            accessibilityRole="button"
            accessibilityState={{ busy: pending, disabled }}
            className="w-full flex-row items-center justify-center gap-3 rounded-full border active:opacity-70"
            disabled={disabled}
            onPress={onPress}
            style={{
                backgroundColor: brand.background,
                borderColor: brand.border,
                height: SIGN_IN_BUTTON_HEIGHT,
                opacity: disabled && !pending ? 0.4 : 1,
            }}
        >
            {pending ? (
                <BusyText className="font-sans-medium text-callout" color={brand.label}>
                    {t("auth.signIn.pending")}
                </BusyText>
            ) : (
                <>
                    <GoogleLogo />
                    <View>
                        <Text className="font-sans-medium text-callout" style={{ color: brand.label }}>
                            {t("auth.google.continue")}
                        </Text>
                    </View>
                </>
            )}
        </Pressable>
    );
}
