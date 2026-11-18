import { HStack, Image, Section, Spacer, Text as SwiftText, VStack } from "@expo/ui/swift-ui";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityLabel,
    background,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    onTapGesture,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";

import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedRows } from "@/components/native/styles";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNotificationDebts } from "@/data/notification-debts";
import { useLanguage, useTranslation } from "@/i18n/context";
import { pushedDebtHref } from "@/lib/notification-taps";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { pushedDebtRow } from "@/screens/debts/pushed-debt";
import { dropNotificationDebtCommand } from "@/state/debt-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

const SUBTITLE = font({ design: "rounded", textStyle: "subheadline" });
const AMOUNT = font({ design: "rounded", textStyle: "subheadline", weight: "medium" });
const GLYPH = font({ design: "rounded", textStyle: "body", weight: "semibold" });
const DISMISS = font({ design: "rounded", textStyle: "footnote", weight: "semibold" });
const TILE_RADIUS = 10;
const DISMISS_SIZE = 28;

export function PushedDebts({ currency }: { currency: string }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const drafts = useNotificationDebts(db);
    const dismiss = useAtomAction(dropNotificationDebtCommand);

    if (drafts.length === 0) {
        return null;
    }
    return (
        <Section
            header={<Eyebrow colors={colors}>{t("debts.pushed.title")}</Eyebrow>}
            modifiers={[groupedRows(colors)]}
        >
            {drafts.map((draft) => {
                const row = pushedDebtRow(draft, { currency, language, showCents, t });
                return (
                    <HStack
                        key={draft.id}
                        modifiers={[
                            hitArea(outline.rectangle()),
                            onTapGesture(() => router.push(pushedDebtHref(draft))),
                        ]}
                        spacing={12}
                    >
                        <HStack
                            modifiers={[
                                accessibilityElement("combine"),
                                accessibilityAddTraits(["isButton"]),
                                accessibilityLabel(`${row.title}, ${row.subtitle}, ${row.amount}`),
                            ]}
                            spacing={12}
                        >
                            <Image
                                color={colors.muted}
                                modifiers={[
                                    GLYPH,
                                    frame({ height: PARENT_TILE, width: PARENT_TILE }),
                                    background(
                                        withAlpha(colors.muted, TILE_WASH_OPACITY),
                                        outline.roundedRectangle({ cornerRadius: TILE_RADIUS })
                                    ),
                                ]}
                                systemName="bell"
                            />
                            <VStack alignment="leading" spacing={1}>
                                <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>
                                    {row.title}
                                </SwiftText>
                                <SwiftText modifiers={[SUBTITLE, lineLimit(1), foregroundStyle(colors.muted)]}>
                                    {row.subtitle}
                                </SwiftText>
                            </VStack>
                            <Spacer />
                            <SwiftText
                                modifiers={[
                                    AMOUNT,
                                    monospacedDigit(),
                                    lineLimit(1),
                                    foregroundStyle(row.positive ? colors.income : LABEL),
                                ]}
                            >
                                {row.amount}
                            </SwiftText>
                        </HStack>
                        <Image
                            color={colors.muted}
                            modifiers={[
                                DISMISS,
                                frame({ height: DISMISS_SIZE, width: DISMISS_SIZE }),
                                hitArea(outline.rectangle()),
                                onTapGesture(() => dismiss({ db, id: draft.id })),
                                accessibilityElement("ignore"),
                                accessibilityAddTraits(["isButton"]),
                                accessibilityLabel(t("debts.pushed.dismiss")),
                            ]}
                            systemName="xmark"
                        />
                    </HStack>
                );
            })}
        </Section>
    );
}
