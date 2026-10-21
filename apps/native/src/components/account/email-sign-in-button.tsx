import Mail01Icon from "@hugeicons-pro/core-stroke-rounded/Mail01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useTheme } from "panelui-native/theme";
import { Pressable } from "react-native";

import { SIGN_IN_BUTTON_HEIGHT } from "@/components/account/apple-sign-in-button";
import { BRAND } from "@/components/account/google-sign-in-button";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";

export function EmailSignInButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
    const t = useTranslation();
    const { theme } = useTheme();
    const brand = theme === "dark" ? BRAND.dark : BRAND.light;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            className="w-full flex-row items-center justify-center gap-3 rounded-full border active:opacity-70"
            disabled={disabled}
            onPress={onPress}
            style={{
                backgroundColor: brand.background,
                borderColor: brand.border,
                height: SIGN_IN_BUTTON_HEIGHT,
                opacity: disabled ? 0.4 : 1,
            }}
        >
            <HugeiconsIcon color={brand.label} icon={Mail01Icon} size={20} strokeWidth={1.7} />
            <Text className="font-sans-medium text-callout" style={{ color: brand.label }}>
                {t("auth.email.continue")}
            </Text>
        </Pressable>
    );
}
