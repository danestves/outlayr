import * as Cause from "effect/Cause";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";

import { CloseToolbar } from "@/components/close-toolbar";
import { EditorCta } from "@/components/editor-cta";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useMonthRecap } from "@/data/use-month-recap";
import { useNow } from "@/data/use-now";
import { monthLongTitle } from "@/domain/dates";
import { layoutRecapCard } from "@/domain/recap-card";
import { recapMonth, recapMonthKey } from "@/domain/recap-month";
import { useLanguage, useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { EditorSwitch } from "@/screens/budgets/components/editor-switch";
import { SILENT } from "@/state/atom-command";
import { shareRecapCardCommand } from "@/state/transfer-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { recapCardInput } from "./card-input";
import { RecapCardPreview } from "./recap-card-preview";

const GUTTER = 20;

export function RecapShare({ month: monthKey }: { month: string | undefined }) {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const { width } = useWindowDimensions();
    const { showCents } = useDisplaySettings().state;
    const code = useGlobalCurrency(db);
    const nowMs = useNow();
    const month = recapMonth(monthKey, new Date(nowMs));
    const recap = useMonthRecap(db, nowMs, month);
    const [showAmounts, setShowAmounts] = useState(false);
    const [sharing, setSharing] = useState(false);
    const share = useAtomAction(
        shareRecapCardCommand,
        {
            onFailure: (cause) => {
                console.warn("[outlayr] recap share failed", Cause.squash(cause));
                notifyFailure({ body: t("alerts.dayCard.failedBody"), title: t("alerts.dayCard.failedTitle") });
            },
            onSettled: () => setSharing(false),
        },
        SILENT
    );

    const card = recapCardInput({ code, language, recap, showAmounts, showCents, t });
    const layout = layoutRecapCard(card);

    return (
        <>
            <CloseToolbar placement="left" />
            <View className="bg-background flex-1">
                <ScrollView
                    contentContainerClassName="px-5 pt-6 pb-6"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                >
                    <RecapCardPreview layout={layout} width={width - GUTTER * 2} />
                    <View className="flex-row items-center justify-between pt-5">
                        <Text className="text-body text-foreground">{t("insights.recap.showAmounts")}</Text>
                        <EditorSwitch
                            accessibilityLabel={t("insights.recap.showAmounts")}
                            onValueChange={setShowAmounts}
                            value={showAmounts}
                        />
                    </View>
                </ScrollView>
                <View className="px-5 pt-2 pb-8">
                    <EditorCta
                        busy={sharing}
                        canSave
                        label={t("insights.recap.share", { month: monthLongTitle(month, language) })}
                        onPress={() => {
                            setSharing(true);
                            share({
                                card,
                                dialogTitle: t("insights.recap.shareTitle"),
                                fileName: `outlayr-${recapMonthKey(month)}.png`,
                            });
                        }}
                    />
                </View>
            </View>
        </>
    );
}
