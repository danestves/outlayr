import { useRouter } from "expo-router";
import { ScrollView } from "react-native";

import { AiConsentDetails } from "@/components/ai-consent";
import { FirstRun } from "@/components/first-run";
import { useDatabase } from "@/contexts/local-data-context";
import { saveAiConsent } from "@/data/settings-core";
import { useTranslation } from "@/i18n/context";

/** Asked before an account exists, so the answer is in place before any feature could send. */
export function OnboardingSmartFeatures() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();

    const answer = (allowed: boolean) => {
        saveAiConsent(db, allowed)
            .then(() => router.push("/onboarding/rhythm"))
            .catch((cause: unknown) => {
                console.error("Saving the AI consent failed", cause);
                router.push("/onboarding/rhythm");
            });
    };

    return (
        <FirstRun
            action={{ label: t("aiConsent.allow"), onPress: () => answer(true) }}
            body={t("aiConsent.lead")}
            eyebrow={t("aiConsent.eyebrow")}
            skip={{ label: t("aiConsent.notNow"), onPress: () => answer(false) }}
            title={t("aiConsent.title")}
        >
            {/* Sized to the rows and scrolling only when large text outgrows the stage. */}
            <ScrollView className="shrink grow-0">
                <AiConsentDetails />
            </ScrollView>
        </FirstRun>
    );
}
