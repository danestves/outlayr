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
import { View } from "react-native";

import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedRows } from "@/components/native/styles";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { SavingsGoalWithProgress } from "@/data/savings-goals";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { GoalRail } from "@/screens/budgets/components/goal-row";
import { goalsInOrder } from "@/screens/budgets/components/savings-goals-section";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";

const SUBTITLE = font({ design: "rounded", textStyle: "subheadline" });
const CHEVRON = font({ design: "rounded", textStyle: "footnote", weight: "semibold" });
const ADD_GLYPH = font({ design: "rounded", textStyle: "body", weight: "semibold" });
const TILE_RADIUS = 10;

interface GoalsSectionProps {
    currency: string;
    goals: readonly SavingsGoalWithProgress[];
    onAdd: () => void;
    onOpen: (id: string) => void;
}

export function GoalsSection({ currency, goals, onAdd, onOpen }: GoalsSectionProps) {
    const t = useTranslation();
    const colors = useColors();

    return (
        <Section header={<Eyebrow colors={colors}>{t("goals.heading")}</Eyebrow>} modifiers={[groupedRows(colors)]}>
            {goalsInOrder(goals).map((entry) => (
                <GoalListRow colors={colors} currency={currency} entry={entry} key={entry.goal.id} onOpen={onOpen} />
            ))}
            <HStack
                modifiers={[
                    hitArea(outline.rectangle()),
                    onTapGesture(onAdd),
                    accessibilityElement("combine"),
                    accessibilityAddTraits(["isButton"]),
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
                    systemName="plus"
                />
                <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(colors.tint)]}>
                    {t("goals.add")}
                </SwiftText>
                <Spacer />
            </HStack>
        </Section>
    );
}

interface GoalListRowProps {
    colors: ThemeColors;
    currency: string;
    entry: SavingsGoalWithProgress;
    onOpen: (id: string) => void;
}

function GoalListRow({ colors, currency, entry, onOpen }: GoalListRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { exact, goal, progress, saved, target } = entry;
    const reached = exact && progress.reached;
    const { standing } = progress;
    const ahead = (standing?.onPace ?? false) || (standing != null && standing.against >= 0);
    const figure = exact
        ? t("budgets.spentOfLimit", {
              limit: formatAmount(target, currency, showCents, language),
              spent: formatAmount(saved, currency, showCents, language),
          })
        : t("goals.card.unvalued");

    return (
        <HStack
            modifiers={[
                hitArea(outline.rectangle()),
                onTapGesture(() => onOpen(goal.id)),
                accessibilityElement("combine"),
                accessibilityAddTraits(["isButton"]),
                accessibilityLabel(goal.name),
                accessibilityValue(figure),
            ]}
            spacing={12}
        >
            <VStack alignment="leading" spacing={4}>
                <HStack spacing={8}>
                    <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>{goal.name}</SwiftText>
                    <Spacer />
                    <SwiftText modifiers={[SUBTITLE, monospacedDigit(), lineLimit(1), foregroundStyle(colors.muted)]}>
                        {figure}
                    </SwiftText>
                </HStack>
                {exact ? (
                    <RNHostView matchContents={{ vertical: true }}>
                        <View>
                            <GoalRail
                                behind={!reached && !ahead}
                                expected={standing && target > 0 ? standing.expected / target : null}
                                fraction={progress.fraction}
                                reached={reached}
                            />
                        </View>
                    </RNHostView>
                ) : null}
            </VStack>
            <Image color={colors.muted} modifiers={[CHEVRON]} systemName="chevron.right" />
        </HStack>
    );
}
