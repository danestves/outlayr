import * as Cause from "effect/Cause";
import { useRouter, useSegments } from "expo-router";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { ScrollFade } from "panelui-native/components/scroll-fade";
import { cn } from "panelui-native/utils/cn";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { Text } from "@/components/text";
import { useSheetInsets } from "@/components/use-sheet-insets";
import { useDatabase } from "@/contexts/local-data-context";
import { useAiConsent } from "@/data/settings";
import type { AiConsent } from "@/data/settings-core";
import type { Database } from "@/db/client";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { openInAppBrowser } from "@/lib/app-handoff";
import { useAuthSession } from "@/lib/auth-session";
import { legalUrl } from "@/lib/legal-url";
import { SILENT } from "@/state/atom-command";
import { saveAiConsentCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const FEATURES = [
    { sends: "aiConsent.voiceSends", title: "aiConsent.voice" },
    { sends: "aiConsent.scanSends", title: "aiConsent.scan" },
    { sends: "aiConsent.planScanSends", title: "aiConsent.planScan" },
    { sends: "aiConsent.statementSends", title: "aiConsent.statement" },
    { sends: "aiConsent.suggestionsSends", title: "aiConsent.suggestions" },
    { sends: "aiConsent.notificationsSends", title: "aiConsent.notifications" },
    { sends: "aiConsent.lookupSends", title: "aiConsent.lookup" },
] as const satisfies readonly { sends: TranslationKey; title: TranslationKey }[];

// Leaves the sheet room for the buttons: the intro outgrows a phone screen at the default text size.
const INTRO_MAX_SCREEN_SHARE = 0.6;

export function useRecordAiConsent() {
    const saveAiConsent = useAtomAction(
        saveAiConsentCommand,
        { onFailure: (cause) => console.error("Saving the AI consent failed", Cause.squash(cause)) },
        SILENT
    );
    return (db: Database, allowed: boolean): void => saveAiConsent({ allowed, db });
}

export function AiConsentDetails() {
    const t = useTranslation();
    const { language } = useLanguage();
    return (
        <View>
            {FEATURES.map((feature, index) => (
                <View
                    className={cn("border-border border-t py-2.5", index === FEATURES.length - 1 && "border-b")}
                    key={feature.title}
                >
                    <Text className="text-body text-foreground">{t(feature.title)}</Text>
                    <Text className="text-footnote text-muted pt-0.5 leading-snug">{t(feature.sends)}</Text>
                </View>
            ))}
            <Text className="text-footnote text-muted pt-3 leading-snug">
                {t("aiConsent.fine")}{" "}
                <Text
                    accessibilityRole="link"
                    className="text-tint"
                    onPress={() => openInAppBrowser(legalUrl("privacy", language, "ai"))}
                >
                    {t("aiConsent.privacy")}
                </Text>
            </Text>
        </View>
    );
}

function AiConsentIntro() {
    const t = useTranslation();
    return (
        <View>
            <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                {t("aiConsent.title")}
            </Text>
            <Text className="text-muted text-subtitle pt-1 pb-4 leading-snug">{t("aiConsent.lead")}</Text>
            <AiConsentDetails />
        </View>
    );
}

function AiConsentActions({ onAnswer }: { onAnswer: (allowed: boolean) => void }) {
    const t = useTranslation();
    return (
        <View className="gap-2.5">
            <Button className="rounded-full" fullWidth onPress={() => onAnswer(true)} size="md" variant="primary">
                {t("aiConsent.allow")}
            </Button>
            <Button className="rounded-full" fullWidth onPress={() => onAnswer(false)} size="md" variant="ghost">
                {t("aiConsent.notNow")}
            </Button>
        </View>
    );
}

// Must come before either screen mounts: voice records on open, and both send once they have a clip or a photo.
export function AiConsentGate() {
    const db = useDatabase();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const consent = useAiConsent(db);
    const recordAiConsent = useRecordAiConsent();
    const answer = (allowed: boolean) => {
        if (allowed || consent !== "allowed") {
            recordAiConsent(db, allowed);
        }
        if (!allowed) {
            router.back();
        }
    };
    return (
        <View className="bg-background flex-1">
            {/* panelui's default resolves to its own white `--color-background`, not the app's `--background`. */}
            <ScrollFade className="flex-1" color={colors.background}>
                <ScrollView contentContainerClassName="px-5 pt-8 pb-5 android:pt-safe-offset-8">
                    <AiConsentIntro />
                </ScrollView>
            </ScrollFade>
            <View className="px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                <AiConsentActions onAnswer={answer} />
            </View>
        </View>
    );
}

// Waits for no cover, for the reason `UpdateSheet` does, and stays mounted once asked so an answer animates out.
export function AiConsentSheet() {
    const consent = useAiConsent(useDatabase());
    const [asked, setAsked] = useState(consent === "unanswered");
    if (consent === "unanswered" && !asked) {
        setAsked(true);
    }
    return asked ? <AiConsentSheetBody consent={consent} /> : null;
}

function AiConsentSheetBody({ consent }: { consent: AiConsent }) {
    const db = useDatabase();
    const { gate } = useAuthSession();
    const onTabs = useSegments()[0] === "(tabs)";
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const recordAiConsent = useRecordAiConsent();

    const open = gate === "signed-in" && consent === "unanswered" && onTabs && lockOpen && !covered;

    return <AiConsentPromptSheet onAnswer={(allowed) => recordAiConsent(db, allowed)} open={open} />;
}

export function AiConsentPromptSheet({ onAnswer, open }: { onAnswer: (allowed: boolean) => void; open: boolean }) {
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const { height: screenHeight } = useWindowDimensions();
    return (
        <BottomSheet
            native
            nativeBackground={colors.background}
            onOpenChange={(next) => {
                // Only a swipe the person made is a Not now, not a close this render asked for (an answer, a lock).
                if (!next && open) {
                    onAnswer(false);
                }
            }}
            open={open}
        >
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <BottomSheet.Body style={{ maxHeight: screenHeight * INTRO_MAX_SCREEN_SHARE }}>
                        <AiConsentIntro />
                    </BottomSheet.Body>
                    <View className="android:pb-safe pt-5">
                        <AiConsentActions onAnswer={onAnswer} />
                    </View>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
