import { requestReview } from "expo-store-review";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { AppSymbol } from "@/components/app-symbol";
import { FirstRun } from "@/components/first-run";
import { OutlayrMark } from "@/components/outlayr-mark";
import { useDatabase } from "@/contexts/local-data-context";
import { finishOnboarding } from "@/data/onboarding-core";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const REVIEW_DELAY_MS = 1000;
const STARS = [1, 2, 3, 4, 5] as const;

export function OnboardingRating() {
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const review = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        review.current = setTimeout(() => {
            requestReview().catch((cause: unknown) => {
                console.error("Requesting a store review failed", cause);
            });
        }, REVIEW_DELAY_MS);
        return () => clearTimeout(review.current);
    }, []);

    // `finishOnboarding` settles the root guard, which swaps this stack. Nothing navigates.
    const finish = () => {
        clearTimeout(review.current);
        finishOnboarding(db).catch((cause: unknown) => {
            console.error("Finishing onboarding failed", cause);
        });
    };

    return (
        <FirstRun
            action={{ label: t("common.continue"), onPress: finish }}
            body={t("onboarding.rating.body")}
            eyebrow={t("onboarding.rating.eyebrow")}
            object={
                <View className="items-center gap-4">
                    <OutlayrMark />
                    <View className="flex-row gap-2">
                        {STARS.map((star) => (
                            <AppSymbol key={star} name="star" size={18} tintColor={colors.frMuted} />
                        ))}
                    </View>
                </View>
            }
            title={t("onboarding.rating.title")}
        />
    );
}
