import ArrowDown02Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { RowAmount } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { ROW_TYPE } from "@/components/row-type";
import { Text } from "@/components/text";
import { TILE_RADIUS, TILE_SIZE } from "@/components/transfer-tile";
import { cn } from "@/components/tw";
import { useNow } from "@/data/use-now";
import { bankTextSample } from "@/domain/bank-text-sample";
import { formatTime } from "@/domain/dates";
import type { BankTexts } from "@/hooks/use-auto-log-sources";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const NO_BREAK_SPACE = "\u00A0";

export function OnboardingBankTexts({ bankTexts }: { bankTexts: BankTexts }) {
    const router = useRouter();
    const t = useTranslation();
    const next = () => router.push("/onboarding/smart-features");

    return (
        <FirstRun
            action={
                bankTexts.done
                    ? { label: t("common.continue"), onPress: next }
                    : { label: t("onboarding.bankTexts.action"), onPress: bankTexts.onSetUp }
            }
            eyebrow={t("onboarding.autoLog.eyebrow")}
            footnote={bankTexts.done ? undefined : t("onboarding.bankTexts.footnote")}
            skip={bankTexts.done ? undefined : { label: t("aiConsent.notNow"), onPress: next }}
            title={t("onboarding.bankTexts.title")}
        >
            <BankTextProof />
        </FirstRun>
    );
}

function BankTextProof() {
    const nowMs = useNow();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sample = bankTextSample(new Date(nowMs));

    return (
        <View>
            <MonoLabel className="text-fr-muted">
                {`${t("onboarding.bankTexts.textMessage")} · ${formatTime(sample.at, false, language)}`}
            </MonoLabel>
            <View className="bg-surface-tertiary mt-2 max-w-78 self-start rounded-[18px] rounded-bl-sm px-3.5 py-2.5">
                <Text className="text-fr-ink text-subtitle">
                    {sample.pieces.map((piece) =>
                        piece.read ? (
                            <Text className="decoration-tint underline" key={piece.text}>
                                {piece.text.replaceAll(" ", NO_BREAK_SPACE)}
                            </Text>
                        ) : (
                            piece.text
                        )
                    )}
                </Text>
            </View>
            <View className="items-center py-4.5">
                <HugeiconsIcon color={colors.muted} icon={ArrowDown02Icon} size={20} strokeWidth={1.9} />
            </View>
            <MonoLabel className="text-fr-muted">{t("common.today")}</MonoLabel>
            <View className="bg-fr-rule mt-1.25" style={{ borderRadius: 0.65, height: 1.3 }} />
            <View className="flex-row items-center gap-3 py-3">
                <CategoryIconTile
                    color={colors.income}
                    icon="MoneyReceive01"
                    radius={TILE_RADIUS}
                    size={TILE_SIZE}
                    type="solid"
                />
                <View className="flex-1 gap-0.5">
                    <Text className={cn(ROW_TYPE.title, "text-fr-ink")} numberOfLines={1}>
                        {sample.name}
                    </Text>
                    <Text className={cn(ROW_TYPE.subtitle, "text-fr-muted")} numberOfLines={1}>
                        {sample.bank}
                    </Text>
                </View>
                <RowAmount amount={sample.amount} code={sample.currency} income={sample.income} isFuture={false} />
            </View>
        </View>
    );
}
