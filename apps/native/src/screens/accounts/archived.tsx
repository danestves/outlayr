import { Host } from "@expo/ui";
import { Button, HStack, List, RNHostView, Section, Text as SwiftText, VStack } from "@expo/ui/swift-ui";
import {
    accessibilityLabel,
    buttonStyle,
    fixedSize,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
} from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedList, groupedRows } from "@/components/native/styles";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useAccountBalance } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { formatSentenceDate } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { useArchivedRows } from "./use-archived-rows";

const SUBTITLE = font({ design: "rounded", textStyle: "subheadline" });
const AMOUNT = font({ design: "rounded", textStyle: "subheadline", weight: "medium" });
const RESTORE = font({ design: "rounded", textStyle: "subheadline", weight: "semibold" });
const ARCHIVED_TILE_OPACITY = 0.55;

export function ArchivedAccounts() {
    const t = useTranslation();
    const colors = useColors();
    const { db, restore, rows } = useArchivedRows();

    return (
        <Host style={{ flex: 1 }} useViewportSizeMeasurement>
            <List modifiers={groupedList(colors)}>
                <Section
                    header={<Eyebrow colors={colors}>{t("accounts.census", { count: rows.length })}</Eyebrow>}
                    modifiers={[groupedRows(colors)]}
                >
                    {rows.map((account) => (
                        <ArchivedRow account={account} db={db} key={account.id} onRestore={restore} />
                    ))}
                </Section>
            </List>
        </Host>
    );
}

function ArchivedRow({
    account,
    db,
    onRestore,
}: {
    account: Account;
    db: Database;
    onRestore: (account: Account) => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const balance = useAccountBalance(db, account, useNow());

    return (
        <HStack spacing={12}>
            <RNHostView matchContents>
                <View style={{ height: PARENT_TILE, opacity: ARCHIVED_TILE_OPACITY, width: PARENT_TILE }}>
                    <CategoryIconTile
                        color={account.imageColor ?? account.customColor ?? colors.foreground}
                        emoji={account.emoji}
                        icon={account.icon}
                        imageUri={account.imageUri}
                        size={PARENT_TILE}
                        type="solid"
                    />
                </View>
            </RNHostView>
            <VStack
                alignment="leading"
                modifiers={[frame({ alignment: "leading", maxWidth: Number.POSITIVE_INFINITY })]}
                spacing={1}
            >
                <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>{account.name}</SwiftText>
                {account.archivedAt === null ? null : (
                    <SwiftText modifiers={[SUBTITLE, lineLimit(1), foregroundStyle(colors.muted)]}>
                        {t("accounts.archived.on", { date: formatSentenceDate(account.archivedAt, language) })}
                    </SwiftText>
                )}
            </VStack>
            <SwiftText
                modifiers={[AMOUNT, monospacedDigit(), lineLimit(1), fixedSize(), foregroundStyle(colors.muted)]}
            >
                {formatSignedAmount(balance.total, account.currency, showCents, language)}
            </SwiftText>
            <Button
                modifiers={[
                    buttonStyle("plain"),
                    accessibilityLabel(t("accounts.restore.a11y", { name: account.name })),
                ]}
                onPress={() => onRestore(account)}
            >
                <SwiftText modifiers={[RESTORE, fixedSize(), foregroundStyle(colors.tint)]}>
                    {t("accounts.restore")}
                </SwiftText>
            </Button>
        </HStack>
    );
}
