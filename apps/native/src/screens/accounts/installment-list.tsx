import { HStack, Image, RNHostView, Section, Spacer, Text as SwiftText, VStack } from "@expo/ui/swift-ui";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityLabel,
    accessibilityValue,
    background,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    onTapGesture,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedRows } from "@/components/native/styles";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { DebtsScreenOverview } from "@/data/debts";
import { useNow } from "@/data/use-now";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";

import { installmentRow, installmentRows } from "./installment-rows";

const SUBTITLE = font({ design: "rounded", textStyle: "subheadline" });
const AMOUNT = font({ design: "rounded", textStyle: "subheadline", weight: "medium" });
const PLAN_DATE = font({ design: "rounded", textStyle: "footnote" });
const ADD_GLYPH = font({ design: "rounded", textStyle: "body", weight: "semibold" });
const TILE_RADIUS = 10;

export function InstallmentSection({ debts }: { debts: DebtsScreenOverview }) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const entries = installmentRows(debts);
    if (entries.length === 0) {
        return null;
    }

    return (
        <Section
            header={<Eyebrow colors={colors}>{t("accounts.installments.title")}</Eyebrow>}
            modifiers={[groupedRows(colors)]}
        >
            {entries.map((entry) => {
                const line = installmentRow(entry, { language, nowMs, showCents, t });
                return (
                    <HStack
                        key={entry.id}
                        modifiers={[
                            hitArea(outline.rectangle()),
                            onTapGesture(() =>
                                router.push({
                                    params: { planId: entry.id },
                                    pathname: "/installments/[planId]",
                                })
                            ),
                            accessibilityElement("combine"),
                            accessibilityAddTraits(["isButton"]),
                            accessibilityLabel(`${line.title}, ${line.progress}, ${line.when}`),
                            accessibilityValue(line.amount),
                        ]}
                        spacing={12}
                    >
                        <RNHostView matchContents>
                            <View style={{ height: PARENT_TILE, width: PARENT_TILE }}>
                                <AccountTile account={entry.account} size={PARENT_TILE} />
                            </View>
                        </RNHostView>
                        <VStack alignment="leading" spacing={1}>
                            <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>
                                {line.title}
                            </SwiftText>
                            <SwiftText modifiers={[SUBTITLE, lineLimit(1), foregroundStyle(colors.muted)]}>
                                {line.progress}
                            </SwiftText>
                        </VStack>
                        <Spacer />
                        <VStack alignment="trailing" spacing={1}>
                            <SwiftText modifiers={[AMOUNT, monospacedDigit(), lineLimit(1), foregroundStyle(LABEL)]}>
                                {line.amount}
                            </SwiftText>
                            <SwiftText
                                modifiers={[
                                    PLAN_DATE,
                                    lineLimit(1),
                                    foregroundStyle(line.overdue ? colors.expense : colors.muted),
                                ]}
                            >
                                {line.when}
                            </SwiftText>
                        </VStack>
                    </HStack>
                );
            })}
            <AddInstallmentRow colors={colors} />
        </Section>
    );
}

function AddInstallmentRow({ colors }: { colors: ThemeColors }) {
    const t = useTranslation();
    const item = useNewDebtItems().find((candidate) => candidate.id === "installments");
    if (item === undefined) {
        return null;
    }

    return (
        <HStack
            modifiers={[
                hitArea(outline.rectangle()),
                onTapGesture(item.onPress),
                accessibilityElement("combine"),
                accessibilityAddTraits(["isButton"]),
                accessibilityLabel(t("accounts.add.installments")),
            ]}
            spacing={12}
        >
            <Image
                color={colors.tint}
                modifiers={[
                    ADD_GLYPH,
                    frame({ height: PARENT_TILE, width: PARENT_TILE }),
                    background(
                        withAlpha(colors.tint, TILE_WASH_OPACITY),
                        outline.roundedRectangle({ cornerRadius: TILE_RADIUS })
                    ),
                ]}
                systemName={item.icon ?? "cart"}
            />
            <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(colors.tint)]}>
                {t("accounts.add.installments")}
            </SwiftText>
            <Spacer />
        </HStack>
    );
}
