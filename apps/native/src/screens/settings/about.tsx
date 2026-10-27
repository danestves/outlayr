import { useRouter } from "expo-router";
import { Linking, Share, View } from "react-native";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { expectHandoff, openInAppBrowser } from "@/lib/app-handoff";
import { APP_VERSION } from "@/lib/app-version";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { openStoreReviewCommand } from "@/state/link-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

const WEBSITE = "https://tryoutlayr.com";
const X_PROFILE = "https://x.com/tryoutlayr";
const OUTLAYR_REPO = "https://github.com/danestves/outlayr";
const DIME_REPO = "https://github.com/rafsoh/dimeApp";
const GPL_LICENSE = "https://www.gnu.org/licenses/gpl-3.0.html";
const LOGO_DEV = "https://logo.dev";

export function About() {
    const t = useTranslation();
    const router = useRouter();
    return (
        <SettingsScreen footer={t("settings.about.version", { version: APP_VERSION })}>
            <View className="pt-6">
                <Text className="text-body text-foreground leading-relaxed">{t("settings.about.intro")}</Text>
            </View>

            <SettingsSection title={t("settings.about.outlayr")}>
                <LinkRow
                    icon="Star"
                    onPress={() => {
                        fireAtomCommand(appAtomRegistry, openStoreReviewCommand, undefined, {}, SILENT);
                    }}
                    title={t("settings.row.rate")}
                />
                <LinkRow
                    icon="Share08"
                    onPress={() => {
                        expectHandoff();
                        Share.share({
                            message: t("settings.share.message", { url: WEBSITE }),
                            url: WEBSITE,
                        });
                    }}
                    title={t("settings.row.share")}
                />
                <LinkRow
                    icon="NewTwitter"
                    onPress={() => {
                        expectHandoff();
                        Linking.openURL(X_PROFILE);
                    }}
                    title={t("settings.row.followX")}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.about.links")}>
                <LinkRow
                    icon="SourceCode"
                    onPress={() => openInAppBrowser(OUTLAYR_REPO)}
                    title={t("settings.about.outlayrRepo")}
                />
                <LinkRow
                    icon="Favourite"
                    onPress={() => openInAppBrowser(DIME_REPO)}
                    title={t("settings.about.dimeRepo")}
                />
                <LinkRow
                    icon="License"
                    onPress={() => openInAppBrowser(GPL_LICENSE)}
                    title={t("settings.about.gplLink")}
                />
                <LinkRow
                    icon="LegalDocument01"
                    onPress={() => router.push("/settings/licenses")}
                    title={t("settings.about.openSourceLicenses")}
                />
                <LinkRow
                    icon="Sparkles"
                    onPress={() => openInAppBrowser(LOGO_DEV)}
                    title={t("settings.about.logoDev")}
                />
            </SettingsSection>

            <View className="gap-2 pt-8">
                <MonoLabel>{t("settings.about.licenceHeading")}</MonoLabel>
                <Text className="text-muted text-subtitle leading-relaxed">{t("settings.about.fork")}</Text>
                <Text className="text-muted text-subtitle leading-relaxed">{t("settings.about.copyright")}</Text>
                <Text className="text-muted text-subtitle leading-relaxed">{t("settings.about.warranty")}</Text>
            </View>
        </SettingsScreen>
    );
}
