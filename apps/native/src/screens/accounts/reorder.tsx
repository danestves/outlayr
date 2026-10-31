import { Host } from "@expo/ui";
import { HStack, List, RNHostView, Section, Spacer, Text as SwiftText } from "@expo/ui/swift-ui";
import { deleteDisabled, environment, foregroundStyle, lineLimit } from "@expo/ui/swift-ui/modifiers";
import * as Cause from "effect/Cause";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedList, groupedRows } from "@/components/native/styles";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccountsInOrder } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useNow } from "@/data/use-now";
import { applyMove } from "@/domain/reorder";
import { useTranslation } from "@/i18n/context";
import { reorderAccountsCommand } from "@/state/accounts-commands";
import { SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

export function AccountReorder() {
    const db = useDatabase();
    const reorderAccounts = useAtomAction(
        reorderAccountsCommand,
        { onFailure: (cause) => console.error("Failed to reorder the accounts", Cause.squash(cause)) },
        SILENT
    );
    const t = useTranslation();
    const colors = useColors();
    const rows = useBankAccountsInOrder(db, useNow());

    const reorder = (source: number[], destination: number) => {
        const ordered = applyMove(
            rows.map((account) => account.id),
            source,
            destination
        );
        reorderAccounts({ db, orderedIds: ordered });
    };

    return (
        <Host style={{ flex: 1 }} useViewportSizeMeasurement>
            <List modifiers={[...groupedList(colors), environment({ key: "editMode", value: "active" })]}>
                {/* A non-empty `title` short-circuits the `header` slot natively, hence the eyebrow here. */}
                <Section
                    header={<Eyebrow colors={colors}>{t("accounts.title")}</Eyebrow>}
                    modifiers={[groupedRows(colors)]}
                >
                    <List.ForEach data={rows} keyExtractor={(account) => account.id} onMove={reorder}>
                        {({ item: account }) => (
                            <ReorderRow
                                account={account}
                                tint={account.imageColor ?? account.customColor ?? colors.foreground}
                            />
                        )}
                    </List.ForEach>
                </Section>
            </List>
        </Host>
    );
}

function ReorderRow({ account, tint }: { account: Account; tint: string }) {
    return (
        // Edit mode offers a delete badge, and with no `onDelete` the row would animate away and come back.
        <HStack modifiers={[deleteDisabled(true)]} spacing={12}>
            <RNHostView matchContents>
                <View style={{ height: PARENT_TILE, width: PARENT_TILE }}>
                    <CategoryIconTile
                        color={tint}
                        emoji={account.emoji}
                        icon={account.icon}
                        imageUri={account.imageUri}
                        size={PARENT_TILE}
                        type="solid"
                    />
                </View>
            </RNHostView>
            <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>{account.name}</SwiftText>
            <Spacer />
        </HStack>
    );
}
