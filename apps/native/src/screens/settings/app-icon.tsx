import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { View } from "react-native";

import defaultPreview from "@/assets/images/app-icon-previews/default.png";
import embossPreview from "@/assets/images/app-icon-previews/emboss.png";
import hairlinePreview from "@/assets/images/app-icon-previews/hairline.png";
import inkPreview from "@/assets/images/app-icon-previews/ink.png";
import monoPreview from "@/assets/images/app-icon-previews/mono.png";
import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Image } from "@/components/styled";
import { APP_ICONS, defaultRowDetail, RELEASE_PRIMARY_ICON } from "@/domain/app-icons";
import type { AppIconSlug } from "@/domain/app-icons";
import { useProLocked } from "@/hooks/use-pro-locked";
import { useTranslation } from "@/i18n/context";
import { alternateIconsSupported, useAppIcon } from "@/lib/app-icon";

const PREVIEW = {
    default: defaultPreview,
    emboss: embossPreview,
    hairline: hairlinePreview,
    ink: inkPreview,
    mono: monoPreview,
} satisfies Record<AppIconSlug, number>;

// SAFETY: `extra` is an open record, and absence folds into null on the same line.
const PRIMARY_ICON = (Constants.expoConfig?.extra?.primaryAppIcon as string | undefined) ?? null;

/** `default.png` draws the Release primary, which is not every build's. */
const PREVIEW_MATCHES_PRIMARY = PRIMARY_ICON === RELEASE_PRIMARY_ICON;

export function AppIcon() {
    const t = useTranslation();
    const router = useRouter();
    const locked = useProLocked();
    const { active, choose } = useAppIcon();

    if (!alternateIconsSupported) {
        return (
            <SettingsScreen>
                <SettingsSection footer={t("settings.appIcon.unsupported")} title={t("settings.appIcon.section")} />
            </SettingsScreen>
        );
    }

    return (
        <SettingsScreen>
            <SettingsSection footer={t("settings.appIcon.alertNote")} title={t("settings.appIcon.section")}>
                {APP_ICONS.map((icon) => {
                    const standsForPrimary = icon.slug === "default";
                    return (
                        <ChoiceRow
                            detail={t(standsForPrimary ? defaultRowDetail(PRIMARY_ICON) : icon.detail)}
                            key={icon.slug}
                            label={t(icon.label)}
                            leading={
                                standsForPrimary && !PREVIEW_MATCHES_PRIMARY ? (
                                    <View className="border-border bg-surface-secondary h-11 w-11 rounded-[10px] border" />
                                ) : (
                                    <Image className="h-11 w-11" contentFit="contain" source={PREVIEW[icon.slug]} />
                                )
                            }
                            onPress={() => (locked && icon.name !== null ? router.push("/paywall") : choose(icon.name))}
                            selected={active === icon.name}
                        />
                    );
                })}
            </SettingsSection>
        </SettingsScreen>
    );
}
